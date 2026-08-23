"use client";
import { useState } from "react";
import { createClubAsaasCheckout } from "@/app/checkout/club/actions";

type Props = {
  plan: "ESSENTIAL" | "PRO" | "ELITE";
  name: string;
  monthly: string;
  annual: string;
  annualSaving: string;
  limit: string;
  description: string;
  featured?: boolean;
};

export default function ClubPlanCard(props: Props) {
  const [cycle, setCycle] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");
  const price = cycle === "MONTHLY" ? props.monthly : props.annual;

  return (
    <article className={`commercial-plan-card ${props.featured ? "featured" : ""}`}>
      {props.featured ? <span className="plan-ribbon">MAIS ESCOLHIDO</span> : <span className="plan-kicker">ONZEUP CLUB</span>}
      <h2>{props.name}</h2>
      <p className="plan-description">{props.description}</p>
      <strong className="plan-limit">{props.limit}</strong>

      <div className="billing-toggle" role="group" aria-label="Periodicidade">
        <button type="button" className={cycle === "MONTHLY" ? "active" : ""} onClick={() => setCycle("MONTHLY")}>Mensal</button>
        <button type="button" className={cycle === "ANNUAL" ? "active" : ""} onClick={() => setCycle("ANNUAL")}>Anual</button>
      </div>

      <div className="plan-price">
        <strong>{price}</strong><span>{cycle === "MONTHLY" ? "/mês" : "/ano"}</span>
      </div>
      <p className="plan-saving">{cycle === "ANNUAL" ? props.annualSaving : "Cancele quando quiser."}</p>

      <form action={createClubAsaasCheckout} className="plan-payment-actions">
        <input type="hidden" name="plan" value={props.plan} />
        <input type="hidden" name="cycle" value={cycle} />
        <button name="method" value="CARD">Pagar com cartão</button>
        <button className="btn-secondary" name="method" value="PIX">Pagar com Pix</button>
      </form>
    </article>
  );
}
