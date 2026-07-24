import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Regression guards for the abolished startup mechanisms (issue #107). These
// assert structural properties of the shipped sources so a reintroduced
// "start at zero, correct later" pattern fails CI immediately.
// vitest runs with cwd = frontend/.

const read = (relativePath: string): string => readFileSync(resolve(process.cwd(), relativePath), "utf8");

const mainTsx = read("src/main.tsx");
const appTsx = read("src/App.tsx");
const toolbarTsx = read("src/components/IonToolbarWrapper.tsx");
const variablesCss = read("src/theme/variables.css");
const appCss = read("src/theme/app.css");
const indexHtml = read("index.html");
const mainActivityJava = read("android/app/src/main/java/io/ionic/starter/MainActivity.java");

describe("abolished startup mechanisms stay removed", () => {
	it("has no hardcoded 50px body padding and no inset-padding-top class anywhere", () => {
		for (const source of [mainTsx, appTsx, toolbarTsx, variablesCss, appCss, indexHtml]) {
			expect(source).not.toMatch(/inset-padding-top/);
			// A standalone 50px value (the abolished body padding), not substrings
			// of larger lengths like 350px.
			expect(source).not.toMatch(/(?<!\d)50px/);
		}
		expect(mainTsx).not.toMatch(/body\.style/);
	});

	it("keeps IonToolbarWrapper free of async inset requests and inline padding", () => {
		expect(toolbarTsx).not.toMatch(/capacitor-plugin-safe-area/);
		expect(toolbarTsx).not.toMatch(/getSafeAreaInsets/);
		expect(toolbarTsx).not.toMatch(/paddingTop/);
		expect(toolbarTsx).not.toMatch(/useState|useEffect/);
	});

	it("keeps App free of bottom-inset state and async inset requests", () => {
		expect(appTsx).not.toMatch(/capacitor-plugin-safe-area/);
		expect(appTsx).not.toMatch(/getSafeAreaInsets/);
		expect(appTsx).not.toMatch(/paddingBottom/);
		expect(appTsx).not.toMatch(/setBottom/);
	});

	it("keeps the safe-area plugin confined to the single source in main.tsx", () => {
		expect(mainTsx).toMatch(/capacitor-plugin-safe-area/);
		expect(mainTsx).toMatch(/createSafeAreaSource/);
	});
});

describe("single safe-area mapping with browser CSS-env fallback", () => {
	it.each(["top", "right", "bottom", "left"] as const)("declares the %s app variable with an env() fallback", (side) => {
		expect(variablesCss).toContain(`--app-safe-area-${side}: env(safe-area-inset-${side}, 0px)`);
	});

	it.each(["top", "right", "bottom", "left"] as const)("maps --ion-safe-area-%s to the app source exactly once", (side) => {
		const mapping = new RegExp(`--ion-safe-area-${side}\\s*:`, "g");
		expect(variablesCss.match(mapping)).toHaveLength(1);
		expect(variablesCss).toContain(`--ion-safe-area-${side}: var(--app-safe-area-${side})`);
	});

	it("never writes --ion-safe-area-* outside variables.css", () => {
		for (const source of [mainTsx, appTsx, toolbarTsx, appCss, indexHtml]) {
			expect(source).not.toMatch(/--ion-safe-area-[a-z]+\s*:/);
		}
	});
});

describe("startup document contract", () => {
	it("no longer hardcodes the ion-palette-dark class on the document", () => {
		expect(indexHtml).not.toMatch(/ion-palette-dark/);
	});

	it("no longer requests a black status bar", () => {
		expect(indexHtml).not.toMatch(/content="black"/);
	});

	it("reads the persisted settings-store payload before the bundle loads", () => {
		expect(indexHtml).toContain('localStorage.getItem("app-settings")');
	});
});

describe("native system-bar contrast contract", () => {
	it("reasserts the web-selected bar contrast after every splash removal path", () => {
		expect(mainActivityJava).toMatch(
			/provider\.remove\(\);\s*syncSystemBarsToWebAppearance\(\);\s*return;/,
		);
		expect(mainActivityJava).toMatch(
			/withEndAction\(\(\) -> \{\s*provider\.remove\(\);[\s\S]*?syncSystemBarsToWebAppearance\(\);/,
		);
	});
});

describe("J3 secondary-photo removal contract", () => {
	it("keeps a 44px transparent target around a quiet 30px inner scrim", () => {
		expect(appCss).toMatch(
			/button\.camera-thumbnail-remove\s*\{[\s\S]*?min-width:\s*44px;[\s\S]*?min-height:\s*44px;/,
		);
		expect(appCss).toMatch(
			/\.camera-thumbnail:not\(\.camera-thumbnail-primary\) button\.camera-thumbnail-remove\s*\{[\s\S]*?background:\s*transparent;/,
		);
		expect(appCss).toMatch(
			/\.camera-thumbnail:not\(\.camera-thumbnail-primary\) button\.camera-thumbnail-remove::before\s*\{[\s\S]*?width:\s*30px;[\s\S]*?height:\s*30px;/,
		);
		expect(appCss).toMatch(
			/button\.camera-thumbnail-remove:focus-visible\s*\{[\s\S]*?outline:\s*3px solid var\(--accent\);/,
		);
	});
});
