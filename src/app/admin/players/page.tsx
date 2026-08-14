import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminPlayers(){
 const players=await prisma.playerProfile.findMany({include:{guardian:{include:{user:true}}},orderBy:{createdAt:"desc"}});
 return <><div className="page-head"><div><h1>ONZEUP Players</h1><p className="muted">Perfis esportivos, planos e responsáveis.</p></div><span className="badge">{players.length} perfis</span></div>
 <section className="card"><div className="table-wrap"><table className="table"><thead><tr><th>Atleta</th><th>Responsável</th><th>Plano</th><th>Visibilidade</th><th>URL</th></tr></thead>
 <tbody>{players.map(p=><tr key={p.id}><td><strong>{p.name}</strong><div className="help">{p.nickname||"—"}</div></td><td>{p.guardian.user.name}<div className="help">{p.guardian.user.email}</div></td><td><span className="badge">{p.plan}</span>{p.isComplimentary?<div className="help">Cortesia</div>:null}</td><td>{p.isPublic?"Público":"Privado"}{p.directoryVisible?<div className="help">No catálogo</div>:null}</td><td>{p.isPublic?<Link href={`/${p.slug}`}>/{p.slug}</Link>:"—"}</td></tr>)}</tbody></table></div></section></>
}