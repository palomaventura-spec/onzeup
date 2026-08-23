export const CLUB_PLANS = {
  ESSENTIAL:{code:"STARTER",label:"Essencial",monthly:4990,annual:49900},
  PRO:{code:"PRO",label:"Pro",monthly:9990,annual:99900},
  ELITE:{code:"BUSINESS",label:"Elite",monthly:14990,annual:149900},
} as const;
export type ClubCommercialPlan=keyof typeof CLUB_PLANS;
export type ClubBillingCycle="MONTHLY"|"ANNUAL";
export const clubProduct=(p:ClubCommercialPlan,c:ClubBillingCycle)=>`CLUB_${p}_${c}` as const;
export const clubPrice=(p:ClubCommercialPlan,c:ClubBillingCycle)=>c==="ANNUAL"?CLUB_PLANS[p].annual:CLUB_PLANS[p].monthly;
