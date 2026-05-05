import { IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonSkeletonText, IonText } from "@ionic/react";
import React from "react";

function LoadingPreview() {
	return (
		<>
			<IonCard className='ion-margin-bottom'>
				<IonCardHeader>
					<IonCardTitle>
						<IonSkeletonText animated style={{ height: "20px", width: "50%", borderRadius: 2000 }} />
					</IonCardTitle>
					<IonText color='medium'>
						<IonSkeletonText animated style={{ width: "20%", borderRadius: 2000 }} />
						<IonSkeletonText animated style={{ width: "30%", borderRadius: 2000 }} />
					</IonText>
				</IonCardHeader>
			</IonCard>
			<IonCard className='ion-margin-bottom'>
				<IonCardHeader>
					<IonCardTitle>
						<IonSkeletonText animated style={{ height: "20px", width: "30%", borderRadius: 2000 }} />
					</IonCardTitle>
				</IonCardHeader>
				<IonCardContent>
					<IonSkeletonText className='ion-margin-bottom' animated style={{ height: "40px", width: "100%" }} />
					<IonSkeletonText animated style={{ height: "40px", width: "100%" }} />
				</IonCardContent>
			</IonCard>
			<IonCard className='ion-margin-bottom'>
				<IonCardHeader>
					<IonCardTitle>
						<IonSkeletonText animated style={{ height: "20px", width: "30%", borderRadius: 2000 }} />
					</IonCardTitle>
				</IonCardHeader>
				<IonCardContent>
					<IonSkeletonText className='ion-margin-bottom' animated style={{ height: "40px", width: "100%" }} />
					<IonSkeletonText animated style={{ height: "40px", width: "100%" }} />
				</IonCardContent>
			</IonCard>
			<IonCard className='ion-margin-bottom'>
				<IonCardHeader>
					<IonCardTitle>
						<IonSkeletonText animated style={{ height: "20px", width: "30%", borderRadius: 2000 }} />
					</IonCardTitle>
				</IonCardHeader>
				<IonCardContent>
					<IonSkeletonText className='ion-margin-bottom' animated style={{ height: "40px", width: "100%" }} />
					<IonSkeletonText animated style={{ height: "40px", width: "100%" }} />
				</IonCardContent>
			</IonCard>
		</>
	);
}

export default LoadingPreview;
