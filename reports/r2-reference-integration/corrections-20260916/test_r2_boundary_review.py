"""Independent R2 review/regressions. Synthetic SQLite only; no production startup.

Run with PYTHONPATH pointing to the reviewed backend:
    PYTHON_DOTENV_DISABLED=1 python test_r2_boundary_review.py --out results.json

The two persisted-evidence recovery tests FAIL on the submitted snapshot.
No application source is patched by this script.
"""
from __future__ import annotations

import argparse
import copy
from fractions import Fraction
import hashlib
import json
import math
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import uuid

from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import create_engine, event, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker

import db
from db_models import MealDB, MealItemDB
from api.meals import router as legacy_router
from experimental_reference import service, contract
from experimental_reference.router import router
from reference_catalog import ReferenceCatalog, canonical_bytes


DETAILS: dict = {}


class IndependentR2Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='r2-independent-synthetic-')
        self.addCleanup(self.tmp.cleanup)
        self.engine = create_engine('sqlite:///' + str(Path(self.tmp.name)/'synthetic.db'),
                                    connect_args={'check_same_thread': False})
        self.addCleanup(self.engine.dispose)
        self.sessions = sessionmaker(bind=self.engine)
        with patch.object(db, 'engine', self.engine):
            db.create_tables()
        app = FastAPI()
        app.include_router(router)
        app.include_router(legacy_router)
        def get_session():
            with self.sessions() as session:
                yield session
        app.dependency_overrides[db.get_db] = get_session
        self.client = TestClient(app, raise_server_exceptions=False)
        self.addCleanup(self.client.close)

    def body(self, **changes):
        value = {'meal_name': 'Reviewer synthetic meal',
                 'client_request_id': str(uuid.uuid4()),
                 'expected_catalog_version': contract.CATALOG_VERSION,
                 'created_at': '2026-09-16T12:00:00Z',
                 'items': [{'name': 'Reviewer synthetic component', 'quantity': 1,
                            'unit': 'serving', 'kcal_per_unit': 200,
                            'kcal_per_unit_unit': 'serving',
                            'source_record_id': 'BAO2011-002'}]}
        value.update(changes)
        return value

    def preview(self, body):
        value = copy.deepcopy(body)
        value.pop('client_request_id', None)
        value.pop('created_at', None)
        return self.client.post('/reference-meals/preview', json=value)

    def saved(self, body=None):
        body = body or self.body()
        response = self.client.post('/reference-meals', json=body)
        self.assertEqual(response.status_code, 200, response.text)
        value = response.json()
        mid = value['legacy_compatibility']['id']
        with self.sessions() as session:
            raw = session.get(MealDB, mid).reference_result_json
        return body, mid, value, raw

    def write_raw(self, mid, value):
        with self.engine.begin() as conn:
            conn.execute(text('UPDATE meals SET reference_result_json=:v WHERE id=:id'),
                         {'v': value, 'id': mid})

    def read_raw(self, mid):
        with self.engine.connect() as conn:
            return tuple(conn.execute(text('SELECT typeof(reference_result_json), reference_result_json FROM meals WHERE id=:id'),
                                      {'id': mid}).one())

    def exercise_stored(self, body, mid):
        responses = []
        for method, path, payload in [('GET', '/reference-meals/'+mid, None),
                                      ('GET', '/reference-meals', None),
                                      ('POST', '/reference-meals', body)]:
            response = self.client.request(method, path, json=payload)
            parsed = response.json() if 'application/json' in response.headers.get('content-type','') else None
            row = next((r for r in parsed if r['legacy_compatibility']['id']==mid), None) if isinstance(parsed, list) else parsed
            state = row.get('assessment_state') if isinstance(row,dict) else None
            responses.append({'method': method, 'path_kind': 'list' if path=='/reference-meals' and method=='GET' else 'read' if method=='GET' else 'replay',
                              'http_status':response.status_code, 'assessment_state':state,
                              'assessment_is_null': row.get('assessment') is None if isinstance(row,dict) else None})
        return responses

    def test_all_catalog_sources_match_archived_policy_and_inputs(self):
        data = json.loads(service.CATALOG_PATH.read_bytes())
        catalog = service.load_pinned_catalog()
        counts = {'calculated':0,'unavailable':0}
        max_diff = 0.0
        # Expected arithmetic comes from literal raw values, not the new evaluator.
        with patch.object(service,'load_pinned_catalog', return_value=catalog), patch.object(service.legacy,'model_meal',side_effect=AssertionError('preview used legacy')):
            for rec in data['records']:
                body = self.body()
                body['items'][0]['source_record_id'] = rec['source_record_id']
                r = self.preview(body)
                self.assertEqual(r.status_code,200,r.text)
                assessment=r.json()['assessment']; row=assessment['items'][0];counts[row['status']]+=1
                src=row['source'];raw=rec['raw']
                self.assertEqual(src['source_record_id'],rec['source_record_id'])
                self.assertEqual(src['source_food_wording'],raw['food_name_source'])
                self.assertEqual(src['fii_mean'],raw['FII_pct'])
                self.assertEqual(src['uncertainty_value'],raw['FII_sem'])
                self.assertEqual(src['actual_test_energy_kJ'],raw['actual_test_energy_kJ'])
                self.assertEqual(src['composition_basis_kJ'],raw['composition_basis_kJ'])
                for field in ['source_study','source_doi','source_table','source_printed_page','source_row','source_footnote','test_year']:
                    self.assertEqual(src[field],raw[field],(rec['source_record_id'],field))
                wanted = rec['eligibility']['experimental_fii_input']['status'] == 'candidate'
                self.assertEqual(row['status']=='calculated',wanted)
                if wanted:
                    expected=float(Fraction(str(raw['FII_pct'])) * 2)
                    delta=abs(assessment['reference_load_total']-expected);max_diff=max(max_diff,delta)
                    self.assertTrue(math.isclose(assessment['reference_load_total'],expected,rel_tol=1e-12,abs_tol=1e-12))
                else:self.assertIsNone(assessment['reference_load_total'])
                reread=contract.deserialize_assessment(contract.serialize_assessment(contract.ReferenceResult.model_validate(assessment)))
                self.assertEqual(reread.model_dump(mode='json'),assessment)
        self.assertEqual(counts,{'calculated':138,'unavailable':9})
        with self.sessions() as s:self.assertEqual(s.query(MealDB).count(),0)
        DETAILS['all_records']={'records':147,'status_counts':counts,'max_fraction_vs_float_difference':max_diff,
                                'fraction_comparison_rel_tol':1e-12,'fraction_comparison_abs_tol':1e-12}

    def test_incomplete_energy_or_reference_never_gets_partial_total(self):
        base = self.body()
        for change in [{'source_record_id':None},{'kcal_per_unit':None},{'kcal_per_unit':0},{'source_record_id':'BAO2011-999'}]:
            body=copy.deepcopy(base);body['items'].append(body['items'][0]|change)
            r=self.preview(body);self.assertEqual(r.status_code,200,r.text)
            value=r.json()['assessment'];self.assertIsNone(value['reference_load_total'])
            self.assertEqual(value['items'][0]['reference_load'],138)
            self.assertNotIn('acute_score',value);self.assertNotIn('main_insulin_drivers',value)
            self.assertIsNone(value['items'][1]['reference_load'])
        empty=self.preview(self.body(items=[])).json()['assessment']
        self.assertEqual(empty['reasons'][0]['code'],'no_consumed_items')

    def test_material_inputs_and_units_are_all_fingerprinted(self):
        body=self.body();a=contract.ReferenceSave.model_validate(body);h=service.fingerprint(a)
        changes={'name':'changed component','quantity':2,'unit':'g','kcal_per_unit':None,
                 'kcal_per_unit_unit':None,'nutrition_origin':'label','carb_g':0,'protein_g':0,
                 'fat_g':0,'sat_fat_g':0,'gi':0,'source_record_id':None}
        checked=[]
        for key,val in changes.items():
            candidate=copy.deepcopy(body);candidate['items'][0][key]=val
            if key=='unit':candidate['items'][0]['kcal_per_unit_unit']='g'
            if key=='kcal_per_unit_unit':candidate['items'][0]['kcal_per_unit']=None
            self.assertNotEqual(service.fingerprint(contract.ReferenceSave.model_validate(candidate)),h,key);checked.append(key)
        self.assertEqual(service.fingerprint(contract.ReferenceSave.model_validate(body|{'meal_name':'New title','created_at':'2020-01-01T00:00:00Z'})),h)
        DETAILS['fingerprint_fields_checked']=checked

    def test_runtime_versions_or_catalog_failure_cannot_change_saved_replay(self):
        body,mid,saved,raw=self.saved()
        with patch.object(service,'load_pinned_catalog',side_effect=AssertionError('late catalog')), patch.object(service,'evaluate',side_effect=AssertionError('reevaluation')), patch.object(service.legacy,'model_meal',side_effect=AssertionError('legacy rescoring')):
            self.assertEqual(self.client.post('/reference-meals',json=body).json(),saved)
            self.assertEqual(self.client.get('/reference-meals/'+mid).json(),saved)
        self.assertEqual(self.read_raw(mid),('text',raw))

    def test_loaded_file_disappearance_before_item_iteration_and_commit(self):
        data=service.CATALOG_PATH.read_bytes(); p=Path(self.tmp.name)/'copied_catalog.json';p.write_bytes(data)
        original=service.load_pinned_catalog
        def capture():
            with patch.object(service,'CATALOG_PATH',p):catalog=original()
            p.unlink()
            return catalog
        with patch.object(service,'load_pinned_catalog',side_effect=capture) as loader:
            body=self.body();body['items']*=3
            _,_,saved,_=self.saved(body)
            self.assertEqual(loader.call_count,1)
            self.assertEqual(saved['assessment']['reference_load_total'],414)
        self.assertFalse(p.exists())

    def test_snapshot_deep_immutability(self):
        body=self.body();body.pop('client_request_id');body.pop('created_at')
        draft=contract.ReferencePreview.model_validate(body)
        result=service.evaluate(draft)
        body['items'][0]['quantity']=10
        self.assertEqual(result.items[0].inputs.quantity,1)
        for target,field,value in [(result,'status','unavailable'),(result.items[0].inputs,'quantity',2),
                                   (result.items[0].source,'fii_mean',999),(result.items[0].source.eligibility[0],'status','requires_review')]:
            with self.assertRaises(ValidationError):setattr(target,field,value)
        payload=result.model_dump(mode='json');payload['items'][0]['source']['fii_mean']=999
        self.assertEqual(result.items[0].source.fii_mean,69)

    def test_unreviewed_catalog_is_not_authorized_by_matching_client_expectation(self):
        data=json.loads(service.CATALOG_PATH.read_bytes());data['policy']['limitations'].append('synthetic changed catalog')
        p=Path(self.tmp.name)/'changed_catalog.json';p.write_bytes(canonical_bytes(data));cat=ReferenceCatalog.load(p)
        with patch.object(service,'CATALOG_PATH',p):
            r=self.preview(self.body(expected_catalog_version=cat.version))
            self.assertEqual(r.status_code,503,r.text)
            self.assertEqual(r.json()['detail']['code'],'catalog_unavailable')

    def test_migration_preserves_existing_values_and_null_legacy_assessment(self):
        response=self.client.post('/meals',json={'meal_name':'Synthetic legacy','items':[]});self.assertEqual(response.status_code,200)
        before=response.json()
        with self.engine.begin() as c:
            c.execute(text('ALTER TABLE meals DROP COLUMN reference_result_json'))
            data=c.execute(text('SELECT * FROM meals')).fetchall()
            cols=list(c.execute(text('SELECT * FROM meals')).keys())
        with patch.object(db,'engine',self.engine):db.create_tables();db.create_tables()
        with self.engine.connect() as c:self.assertEqual(c.execute(text('SELECT '+','.join(cols)+' FROM meals')).fetchall(),data)
        self.assertEqual(self.client.get('/meals').json(),[before])
        read=self.client.get('/reference-meals/'+before['id']).json()
        self.assertEqual(read['assessment_state'],'not_evaluated')
        self.assertIsNone(read['assessment'])

    def test_failure_after_flush_rolls_back_entire_save(self):
        def fail(session,context):raise SQLAlchemyError('synthetic reviewer error')
        event.listen(self.sessions.class_,'after_flush',fail)
        try:
            response=self.client.post('/reference-meals',json=self.body());self.assertEqual(response.status_code,500)
            self.assertEqual(response.json()['detail']['code'],'save_failed')
        finally:event.remove(self.sessions.class_,'after_flush',fail)
        with self.sessions() as s:
            self.assertEqual(s.query(MealDB).count(),0);self.assertEqual(s.query(MealItemDB).count(),0)

    def test_control_invalid_text_unknown_version_and_null_are_handled(self):
        body,mid,saved,raw=self.saved();cases=[None,'{synthetic invalid',raw.replace('reference_meal_result_v1','future_result')]
        for case in cases:
            self.write_raw(mid,case)
            with patch.object(service,'load_pinned_catalog',side_effect=AssertionError('catalog read')):out=self.exercise_stored(body,mid)
            expected='not_evaluated' if case is None else 'evidence_error'
            self.assertEqual([(r['http_status'],r['assessment_state']) for r in out],[(200,expected)]*3)
            self.assertEqual(self.read_raw(mid)[1],case)

    def test_malformed_requests_and_invalid_zero_quantity_rows_are_rejected(self):
        base=self.body()
        for val in [True,'1',-1,float('nan'),float('inf'),10**400]:
            body=copy.deepcopy(base);body['items'][0]['quantity']=val
            response=self.client.post('/reference-meals',content=json.dumps(body),headers={'Content-Type':'application/json'})
            self.assertEqual(response.status_code,422,response.text)
            self.assertEqual(response.json()['detail']['code'],'invalid_reference_request')
        body=copy.deepcopy(base);body['items'][0].update(quantity=0,source={'fii_mean':42})
        self.assertEqual(self.client.post('/reference-meals',json=body).status_code,422)
        with self.sessions() as s:self.assertEqual(s.query(MealDB).count(),0)

    def test_regression_missing_persisted_versions_must_not_be_reconstructed(self):
        body,mid,saved,raw=self.saved();all_results=[]
        for keys in [('formula_version',),('result_schema_version',),('envelope_version',),('formula_version','result_schema_version','envelope_version')]:
            obj=json.loads(raw)
            for key in keys:
                if key=='envelope_version':obj.pop(key)
                else:obj['assessment'].pop(key)
            # Keep original hash unchanged, as a truncation/corruption could.
            corrupted=json.dumps(obj)
            raw_assessment_hash=hashlib.sha256(canonical_bytes(obj['assessment'])).hexdigest()
            self.write_raw(mid,corrupted)
            with patch.object(service,'load_pinned_catalog',side_effect=AssertionError('catalog read')), patch.object(service,'evaluate',side_effect=AssertionError('reevaluation')):
                outcomes=self.exercise_stored(body,mid)
            self.assertEqual(self.read_raw(mid),('text',corrupted))
            all_results.append({'deleted_fields':keys,'raw_payload_hash_matches':raw_assessment_hash==obj['sha256'],
                                'outcomes':outcomes,'stored_bytes_unchanged':True})
        DETAILS['missing_version_regression']=all_results
        actual=[(r['http_status'],r['assessment_state']) for case in all_results for r in case['outcomes']]
        self.assertEqual(actual,[(200,'evidence_error')]*len(actual),
                         'Missing persisted identities were restored by defaults before the hash was checked.')

    def test_regression_blob_assessment_does_not_break_read_list_or_replay(self):
        body,mid,saved,raw=self.saved();_,good_id,good_saved,_=self.saved();all_results=[]
        for blob in [b'\x80synthetic invalid binary',raw.encode('utf-8')]:
            self.write_raw(mid,blob)
            self.assertEqual(self.read_raw(mid),('blob',blob))
            with patch.object(service,'load_pinned_catalog',side_effect=AssertionError('catalog read')),patch.object(service,'evaluate',side_effect=AssertionError('reevaluation')):
                outcomes=self.exercise_stored(body,mid)
            self.assertEqual(self.read_raw(mid),('blob',blob))
            self.assertEqual(self.client.get('/reference-meals/'+good_id).json(),good_saved)
            all_results.append({'blob_case':'invalid_binary' if blob!=raw.encode() else 'valid_json_stored_as_blob',
                                'outcomes':outcomes,'sqlite_storage_type':'blob','stored_bytes_unchanged':True,
                                'healthy_single_record_read_unchanged':True})
        DETAILS['blob_regression']=all_results
        actual=[(r['http_status'],r['assessment_state']) for case in all_results for r in case['outcomes']]
        self.assertEqual(actual,[(200,'evidence_error')]*len(actual),
                         'A non-TEXT value escaped the evidence_error boundary and broke the request.')


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--out',type=Path,required=True);args=parser.parse_args()
    suite=unittest.defaultTestLoader.loadTestsFromTestCase(IndependentR2Tests)
    result=unittest.TextTestRunner(verbosity=2).run(suite)
    report={'tests_run':result.testsRun,'passed':result.testsRun-len(result.failures)-len(result.errors)-len(result.skipped),
            'failures':[{'test':t.id(),'traceback':e} for t,e in result.failures],
            'errors':[{'test':t.id(),'traceback':e} for t,e in result.errors],
            'details':DETAILS,'synthetic_data_only':True}
    args.out.parent.mkdir(parents=True,exist_ok=True);args.out.write_text(json.dumps(report,indent=2)+'\n')
    db.engine.dispose()
    raise SystemExit(0 if result.wasSuccessful() else 1)
