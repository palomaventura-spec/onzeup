import Link from "next/link";



import SafeAvatar from "@/components/SafeAvatar";

import ModuleTour from "@/components/help/ModuleTour";



import { requireClubPermission } from "@/lib/club-access";

import { hasClubPermission } from "@/lib/club-permissions";

import { prisma } from "@/lib/prisma";




import AthleteCreateForm from "./AthleteCreateForm";
import AthleteCreateDialog from "./AthleteCreateDialog";
type AthleteFilters = {

   q?: string;

   category?: string;
   sport?: string;

   
position?: string;

   status?: string;

   view?: string;

   page?: string;

};



type AthleteIcon =

   | "users"

   | "evaluation"

   | "categories"

   | "alert"

   | "search"

   | "plus"

   | "file"

   | "performance"

   | "arrow"

   | "chevron-left"

   | "chevron-right";



const PAGE_SIZE = 20;



function Icon({

   name,

   size = 20,

}: {

   name: AthleteIcon;

   size?: number;

}) {

   const common = {

      width: size,

      height: size,

      viewBox: "0 0 24 24",

      fill: "none",

      stroke: "currentColor",

      strokeWidth: 1.9,

      strokeLinecap: "round" as const,

      strokeLinejoin: "round" as const,

      "aria-hidden": true,

   };



   if (name === "users") {

      return (

         <svg {...common}>

            <circle cx="9" cy="8" r="3" />

            <path d="M3.5 20c.7-4 2.7-6 5.5-6s4.8 2 5.5 6" />

            <path d="M16 7a2.5 2.5 0 0 1 0 5" />

            <path d="M17 15c2 .5 3.2 2.1 3.7 5" />

         </svg>

      );

   }



   if (name === "evaluation") {

      return (

         <svg {...common}>

            <path d="M12 3 4 7v5c0 4.5 3.1 7.7 8 9 4.9-1.3 8-4.5 8-9V7l-8-4Z" />

            <path d="m9 12 2 2 4-4" />

         </svg>

      );

   }



   if (name === "categories") {

      return (

         <svg {...common}>

            <rect x="3" y="3" width="7" height="7" rx="1" />

            <rect x="14" y="3" width="7" height="7" rx="1" />

            <rect x="3" y="14" width="7" height="7" rx="1" />

            <rect x="14" y="14" width="7" height="7" rx="1" />

         </svg>

      );

   }



   if (name === "alert") {

      return (

         <svg {...common}>

            <path d="M12 3 2.8 19h18.4L12 3Z" />

            <path d="M12 9v4M12 17h.01" />

         </svg>

      );

   }



   if (name === "search") {

      return (

         <svg {...common}>

            <circle cx="11" cy="11" r="7" />

            <path d="m20 20-4-4" />

         </svg>

      );

   }



   if (name === "plus") {

      return (

         <svg {...common}>

            <path d="M12 5v14M5 12h14" />

         </svg>

      );

   }



   if (name === "file") {

      return (

         <svg {...common}>

            <path d="M6 3h8l4 4v14H6z" />

            <path d="M14 3v5h5M9 13h6M9 17h5" />

         </svg>

      );

   }



   if (name === "performance") {

      return (

         <svg {...common}>

            <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />

         </svg>

      );

   }



   if (name === "arrow") {

      return (

         <svg {...common}>

            <path d="M5 12h14" />

            <path d="m14 7 5 5-5 5" />

         </svg>

      );

   }



   if (name === "chevron-left") {

      return (

         <svg {...common}>

            <path d="m15 18-6-6 6-6" />

         </svg>

      );

   }



   return (

      <svg {...common}>

         <path d="m9 18 6-6-6-6" />

      </svg>

   );

}



function ageFromYear(year: number | null) {

   return year ? new Date().getFullYear() - year : null;

}

function categoryTabLabel(name: string) {
   const match = name.match(/\bsub[\s-]*0?(\d{1,2})\b/i);

   if (!match) return name;

   return `Sub-${String(Number(match[1])).padStart(2, "0")}`;
}



function athletesUrl({

   q,

   category,
   sport,

   position,

   status,

   view,

   page,

}: {

   q?: string;

   category?: string;
   sport?: string;

   
position?: string;

   status?: string;

   view?: string;

   page?: number;

}) {

   const query = new URLSearchParams();



   if (q) query.set("q", q);

   if (category && category !== "ALL") query.set("category", category);
   if (sport && sport !== "ALL") query.set("sport", sport);

   if (position && position !== "ALL") query.set("position", position);

   if (status && status !== "ALL") query.set("status", status);

   if (view && view !== "ELENCO") query.set("view", view);

   if (page && page > 1) query.set("page", String(page));



   const suffix = query.toString();

   return suffix ? `/atletas?${suffix}` : "/atletas";

}



export default async function AthletesPage({

   searchParams,

}: {

   searchParams: Promise<AthleteFilters>;

}) {

   const user = await requireClubPermission("ATHLETES_VIEW");

   const canEdit = hasClubPermission(user, "ATHLETES_EDIT");

   const filters = await searchParams;



   const query = (filters.q || "")

      .trim()

      .toLocaleLowerCase("pt-BR");



   const categoryFilter = filters.category || "ALL";

   const sportFilter = ["FOOTBALL", "FUTSAL"].includes(
      filters.sport || "",
   )
      ? filters.sport!
      : "ALL";

   const positionFilter = filters.position || "ALL";



   const statusFilter = ["APTO", "INAPTO"].includes(

      filters.status || "",

   )

      ? filters.status!

      : "ALL";



   const athleteView = [

      "ELENCO",

      "EVALUATION",

      "REJECTED",

      "RELEASED",

      "ALL",

   ].includes(filters.view || "")

      ? filters.view!

      : "ELENCO";



   const requestedPage = Math.max(

      1,

      Number.parseInt(filters.page || "1", 10) || 1,

   );



   const [athletes, categories] = await Promise.all([

      prisma.athlete.findMany({

         where: {

            organizationId: user.organizationId,

         },

         include: {

            category: true,

            memberships: {
               where: {
                  status: "ACTIVE",
               },
               select: {
                  id: true,
                  sport: true,
                  categoryId: true,
               },
            },

            callUps: {

               where: {

                  status: "PENDING",

               },

            },

            charges: {

               where: {

                  status: "PENDING",

               },

            },

            playerLinks: {

               include: {

                  player: true,

               },

            },

            documents: {

               where: {

                  deletedAt: null,

               },

               select: {

                  id: true,

                  status: true,

                  expiresAt: true,

                  category: true,


                  createdAt: true,

               },

            },

            registrationRequests: {

               where: {

                  status: "PENDING",

               },

               select: {

                  id: true,

                  status: true,

                  expiresAt: true,

                  createdAt: true,

               },

            },

            evaluations: {

               where: {

                  status: "FINALIZED",

               },

               select: {

                  id: true,

               },

            },

            evaluationProcesses: {

               orderBy: {

                  startedAt: "desc",

               },

               take: 1,

               select: {

                  id: true,

                  status: true,

                  entryMode: true,

                  startedAt: true,

                  decidedAt: true,

                  evaluationCategoryNameSnapshot: true,

                  targetCategoryNameSnapshot: true,

               },

            },

            eligibilityIssues: {

               where: {

                  blocking: true,

                  resolvedAt: null,

               },

               select: {

                  id: true,

                  type: true,

                  startedAt: true,

               },

               orderBy: {

                  startedAt: "asc",

               },

            },

         },

         orderBy: [

            {

               active: "desc",

            },

            {

               name: "asc",

            },

         ],

      }),



      prisma.category.findMany({

         where: {

            organizationId: user.organizationId,

         },

         orderBy: [

            {

               type: "asc",

            },

            {

               name: "asc",

            },

         ],
         include: {
            evaluationTargets: {
               include: {
                  targetCategory: true,

               },
            },
         },


      })



   ]);
const positions = [

      ...new Set(

         athletes

            .map((athlete) => athlete.position)

            .filter(Boolean),

      ),

   ].sort((a, b) =>

      a!.localeCompare(b!, "pt-BR"),

   ) as string[];



   function athleteFolder(

      athlete: (typeof athletes)[number],

   ) {

      if (athlete.currentStatus === "EVALUATION") return "EVALUATION";

      if (athlete.currentStatus === "REJECTED") return "REJECTED";

      if (athlete.currentStatus === "RELEASED") return "RELEASED";

      if (

         athlete.currentStatus === "ACTIVE" &&

         athlete.category?.type === "STANDARD"

      ) {

         return "ELENCO";

      }

      return "OTHER";

   }



   function athleteEligibility(

      athlete: (typeof athletes)[number],

   ) {

      if (athleteFolder(athlete) !== "ELENCO") return null;

      return athlete.eligibilityIssues.length > 0 ? "INAPTO" : "APTO";

   }



   const activeCount = athletes.filter(

      (athlete) => athleteFolder(athlete) === "ELENCO",

   ).length;



   const selectedCategoryRoster = athletes.filter((athlete) => {

      if (athleteFolder(athlete) !== "ELENCO") return false;

      if (categoryFilter === "ALL") return true;

      if (categoryFilter === "UNCATEGORIZED") return !athlete.categoryId;

      return athlete.categoryId === categoryFilter;

   });



   const selectedCategoryActiveCount = selectedCategoryRoster.length;



   const aptCount = selectedCategoryRoster.filter(

      (athlete) => athleteEligibility(athlete) === "APTO",

   ).length;



   const unfitCount = selectedCategoryRoster.filter(

      (athlete) => athleteEligibility(athlete) === "INAPTO",

   ).length;



   const evaluationCount = athletes.filter(

      (athlete) => athleteFolder(athlete) === "EVALUATION",

   ).length;



   const standardCategoryCount = categories.filter(

      (category) => category.active && category.type === "STANDARD",

   ).length;

   const allowedCategoryTabs = new Set(["Sub-06", "Sub-07", "Sub-08"]);

   const rosterCategories = categories
      .filter(
         (category) =>
            category.active &&
            category.type === "STANDARD" &&
            allowedCategoryTabs.has(categoryTabLabel(category.name)),
      )
      .sort((a, b) =>
         categoryTabLabel(a.name).localeCompare(
            categoryTabLabel(b.name),
            "pt-BR",
            { numeric: true },
         ),
      );

   const categoryTabItems = rosterCategories.map((category) => ({
      id: category.id,
      label: categoryTabLabel(category.name),
      count: athletes.filter(
         (athlete) =>
            athleteFolder(athlete) === "ELENCO" &&
            athlete.categoryId === category.id,
      ).length,
   }));



   const hasFootballCategory = categories.some(
      (category) =>
         category.active &&
         (category.sport === "FOOTBALL" || category.sport === "BOTH"),
   );

   const hasFutsalCategory = categories.some(
      (category) =>
         category.active &&
         (category.sport === "FUTSAL" || category.sport === "BOTH"),
   );

   const activeFootballAthleteIds = new Set(
      athletes
         .filter((athlete) => athleteFolder(athlete) === "ELENCO")
         .filter((athlete) =>
            athlete.memberships.some(
               (membership) =>
                  membership.sport === "FOOTBALL" ||
                  membership.sport === "BOTH",
            ),
         )
         .map((athlete) => athlete.id),
   );

   const activeFutsalAthleteIds = new Set(
      athletes
         .filter((athlete) => athleteFolder(athlete) === "ELENCO")
         .filter((athlete) =>
            athlete.memberships.some(
               (membership) =>
                  membership.sport === "FUTSAL" ||
                  membership.sport === "BOTH",
            ),
         )
         .map((athlete) => athlete.id),
   );

   const navigationCategories = categories
      .filter((category) => {
         if (!category.active) return false;

         if (category.type === "STANDARD") {
            return true;
         }

         if (category.type === "EVALUATION") {
            return athletes.some(
               (athlete) =>
                  athleteFolder(athlete) === "EVALUATION" &&
                  athlete.categoryId === category.id,
            );
         }

         return false;
      })
      .map((category) => ({
         id: category.id,
         name: category.name,
         sport: category.sport,
         type: category.type,
         athleteCount: athletes.filter((athlete) =>
            athlete.memberships.some(
               (membership) =>
                  membership.categoryId === category.id,
            ),
         ).length,
      }))
      .sort((a, b) => {
         const nameCompare = a.name.localeCompare(
            b.name,
            "pt-BR",
            { numeric: true },
         );

         if (nameCompare !== 0) return nameCompare;

         return a.sport.localeCompare(b.sport);
      });
   const rejectedCount = athletes.filter(

      (athlete) => athleteFolder(athlete) === "REJECTED",

   ).length;



   const releasedCount = athletes.filter(

      (athlete) => athleteFolder(athlete) === "RELEASED",

   ).length;



   const missingDataCount = athletes.filter(

      (athlete) =>

         athlete.currentStatus === "ACTIVE" &&

         (!athlete.photoUrl ||

            !athlete.position ||

            !athlete.birthYear),

   ).length;



   const now = new Date();



   const documentAlertCount = athletes.filter((athlete) => {

      if (

         !["ELENCO", "EVALUATION"].includes(

            athleteFolder(athlete),

         )

      ) {

         return false;

      }



      const activeDocuments = athlete.documents.filter(

         (document) => document.status !== "ARCHIVED",

      );



      const expiredDocuments = activeDocuments.filter(

         (document) =>

            document.status === "EXPIRED" ||

            Boolean(

               document.expiresAt &&

                  document.expiresAt < now,

            ),

      ).length;



      const pendingDocuments = activeDocuments.filter(

         (document) => document.status === "PENDING",

      ).length;



      const rejectedDocuments = activeDocuments.filter(

         (document) => document.status === "REJECTED",

      ).length;



      const hasPendingRequest =

         athlete.registrationRequests.some(

            (request) =>

               request.status === "PENDING" &&

               request.expiresAt >= now,

         );



      const confirmedAt =

         athlete.documentationConfirmedAt;



      const hasDocumentsAfterConfirmation = confirmedAt

         ? activeDocuments.some(

               (document) =>

                  document.createdAt > confirmedAt,

            )

         : false;



      const documentationInDay =

         Boolean(confirmedAt) &&

         activeDocuments.length > 0 &&

         pendingDocuments === 0 &&

         rejectedDocuments === 0 &&

         expiredDocuments === 0 &&

         !hasPendingRequest &&

         !hasDocumentsAfterConfirmation;



      return !documentationInDay;

   }).length;



   const filteredAthletes = athletes.filter((athlete) => {

      const searchable =

         `${athlete.name} ${athlete.nickname || ""}`.toLocaleLowerCase(

            "pt-BR",

         );



      const folder = athleteFolder(athlete);



      return (

         (athleteView === "ALL" ||

            folder === athleteView) &&

         (!query || searchable.includes(query)) &&

         (categoryFilter === "ALL" ||

            (categoryFilter === "UNCATEGORIZED"

               ? !athlete.categoryId

               : athlete.categoryId === categoryFilter)) &&

         (sportFilter === "ALL" ||
            athlete.memberships.some(
               (membership) =>
                  membership.sport === sportFilter ||
                  membership.sport === "BOTH",
            )) &&
         (positionFilter === "ALL" ||

            athlete.position === positionFilter) &&

         (statusFilter === "ALL" ||

            athleteEligibility(athlete) === statusFilter)

      );

   });



   const totalPages = Math.max(

      1,

      Math.ceil(filteredAthletes.length / PAGE_SIZE),

   );



   const currentPage = Math.min(

      requestedPage,

      totalPages,

   );



   const pageStart = (currentPage - 1) * PAGE_SIZE;

   const pageAthletes = filteredAthletes.slice(

      pageStart,

      pageStart + PAGE_SIZE,

   );



   const showAthleteList = Boolean(
      filters.view ||
      query ||
      categoryFilter !== "ALL" ||
      sportFilter !== "ALL" ||
      positionFilter !== "ALL" ||
      statusFilter !== "ALL"
   );
   const hasFilters = Boolean(

      query ||

         athleteView !== "ELENCO" ||

         categoryFilter !== "ALL" ||
         sportFilter !== "ALL" ||

         positionFilter !== "ALL" ||

         statusFilter !== "ALL",

   );



   const paginationBase = {

      q: filters.q || "",

      category: categoryFilter,
      sport: sportFilter,

      position: positionFilter,

      status: statusFilter,

      view: athleteView,

   };



   const pageNumbers = Array.from(

      { length: totalPages },

      (_, index) => index + 1,

   ).filter(

      (page) =>

         page === 1 ||

         page === totalPages ||

         Math.abs(page - currentPage) <= 1,

   );



   return (

      <div className="athletes-v4">

         <section className="athletes-v4-hero">

            <div className="athletes-v4-hero-copy">

               <span className="athletes-v4-eyebrow">

                  11UP CLUB · GESTÃO DO ELENCO

               </span>



               <div className="athletes-v4-title-line">

                  <span className="athletes-v4-title-icon">

                     <Icon name="users" size={24} />

                  </span>



                  <div>

                     <h1>Atletas</h1>

                     <p>

                        Cadastro, localização e acompanhamento do elenco

                        em uma central preparada para clubes de qualquer tamanho.

                     </p>

                  </div>

               </div>

            </div>



            <div className="athletes-v4-hero-actions">
                {canEdit ? (
                  <Link
                    href="/atletas/pre-cadastros"
                    style={{
                      minHeight: 46,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "0 18px",
                      borderRadius: 13,
                      border: "1px solid rgba(255,255,255,.24)",
                      background: "rgba(255,255,255,.10)",
                      color: "#ffffff",
                      textDecoration: "none",
                      fontSize: 12,
                      fontWeight: 900,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Icon name="file" size={17} />
                    Cadastro digital
                  </Link>
                ) : null}

               {canEdit ? (

                  <AthleteCreateDialog
                     trigger={
                        <>
                           <Icon name="plus" size={17} />
                           Novo atleta
                        </>
                     }
                  >
                     <AthleteCreateForm categories={categories} />
                  </AthleteCreateDialog>

               ) : null}



               <div className="athletes-v4-help">

                  <ModuleTour module="atletas" />

               </div>

            </div>

         </section>



         <section

            className="athletes-v4-kpis"

            aria-label="Indicadores de atletas"

         >

            <article>

               <span className="athletes-v4-kpi-icon">

                  <Icon name="users" />

               </span>

               <div>

                  <small>ELENCO ATIVO</small>

                  <strong>{activeCount}</strong>

                  <span>categorias oficiais</span>

               </div>

            </article>



            <article>

               <span className="athletes-v4-kpi-icon evaluation">

                  <Icon name="evaluation" />

               </span>

               <div>

                  <small>EM AVALIAÇÃO</small>

                  <strong>{evaluationCount}</strong>

                  <span>processo de entrada</span>

               </div>

            </article>



            <article>

               <span className="athletes-v4-kpi-icon">

                  <Icon name="categories" />

               </span>

               <div>

                  <small>CATEGORIAS</small>

                  <strong>{standardCategoryCount}</strong>

                  <span>categorias oficiais</span>

               </div>

            </article>



            <article className={

               documentAlertCount + missingDataCount

                  ? "attention"

                  : ""

            }>

               <span className="athletes-v4-kpi-icon attention">

                  <Icon name="alert" />

               </span>

               <div>

                  <small>ATENÇÃO</small>

                  <strong>

                     {documentAlertCount + missingDataCount}

                  </strong>

                  <span>documentos ou cadastros</span>

               </div>

            </article>

         </section>
<nav

         className="athletes-v4-folders"

         aria-label="Pastas de atletas"

      >

         <Link href="/atletas?view=ELENCO" className={filters.view === "ELENCO" ? "active" : ""}>

            Elenco <strong>{activeCount}</strong>

         </Link>

         <Link href="/atletas?view=EVALUATION" className={athleteView === "EVALUATION" ? "active" : ""}>

            Em avaliação <strong>{evaluationCount}</strong>

         </Link>

         <Link href="/atletas?view=REJECTED" className={athleteView === "REJECTED" ? "active" : ""}>

            Reprovados <strong>{rejectedCount}</strong>

         </Link>

         <Link href="/atletas?view=RELEASED" className={athleteView === "RELEASED" ? "active" : ""}>

            Liberados <strong>{releasedCount}</strong>

         </Link>


         <Link href="/atletas?view=ALL" className={athleteView === "ALL" ? "active" : ""}>

            Todos <strong>{athletes.length}</strong>

         </Link>

      </nav>

      <section
         className="athletes-v4-navigation-sections"
         style={{
            display: "grid",
            gap: 18,
            marginTop: 18,
            marginBottom: 18,
         }}
      >
         <div>
            <div
               style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 10,
               }}
            >
               <div>
                  <span className="athletes-v4-eyebrow">
                     MODALIDADES
                  </span>
                  <h2
                     style={{
                        margin: "3px 0 0",
                        fontSize: 18,
                     }}
                  >
                     Gestão por modalidade
                  </h2>
               </div>
            </div>

            <div
               style={{
                  display: "grid",
                  gridTemplateColumns:
                     "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 12,
               }}
            >
               {hasFootballCategory ? (

               <Link
                  href="/atletas?sport=FOOTBALL"
                  style={{
                     textDecoration: "none",
                     color: "inherit",
                     background: "#ffffff",
                     border: "1px solid #e4e9e5",
                     borderRadius: 16,
                     padding: 18,
                     display: "flex",
                     justifyContent: "space-between",
                     alignItems: "center",
                     gap: 12,
                  }}
               >
                  <div>
                     <strong
                        style={{
                           display: "block",
                           fontSize: 17,
                        }}
                     >
                        Futebol
                     </strong>

                     <small
                        style={{
                           color: "#6f786f",
                        }}
                     >
                        Atletas de campo
                     </small>
                  </div>

                  <strong
                     style={{
                        fontSize: 22,
                     }}
                  >
                     {activeFootballAthleteIds.size}
                  </strong>
               </Link>

               ) : null}

               {hasFutsalCategory ? (


               <Link
                  href="/atletas?sport=FUTSAL"
                  style={{
                     textDecoration: "none",
                     color: "inherit",
                     background: "#ffffff",
                     border: "1px solid #e4e9e5",
                     borderRadius: 16,
                     padding: 18,
                     display: "flex",
                     justifyContent: "space-between",
                     alignItems: "center",
                     gap: 12,
                  }}
               >
                  <div>
                     <strong
                        style={{
                           display: "block",
                           fontSize: 17,
                        }}
                     >
                        Futsal
                     </strong>

                     <small
                        style={{
                           color: "#6f786f",
                        }}
                     >
                        Atletas de futsal
                     </small>
                  </div>

                  <strong
                     style={{
                        fontSize: 22,
                     }}
                  >
                     {activeFutsalAthleteIds.size}
                  </strong>
               </Link>


               ) : null}
            </div>
         </div>

         <div>
            <div
               style={{
                  marginBottom: 10,
               }}
            >
               <span className="athletes-v4-eyebrow">
                  CATEGORIAS
               </span>

               <h2
                  style={{
                     margin: "3px 0 0",
                     fontSize: 18,
                  }}
               >
                  Elenco por categoria
               </h2>
            </div>

            <div
               style={{
                  display: "grid",
                  gridTemplateColumns:
                     "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 10,
               }}
            >
               {navigationCategories.map((category) => (
                  <Link
                     key={category.id}
                     href={`/atletas/categoria/${category.id}`}
                     style={{
                        textDecoration: "none",
                        color: "inherit",
                        background: "#ffffff",
                        border: "1px solid #e4e9e5",
                        borderRadius: 14,
                        padding: "14px 16px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                     }}
                  >
                     <div>
                        <strong
                           style={{
                              display: "block",
                           }}
                        >
                           {category.name}
                        </strong>

                        <small
                           style={{
                              color: "#6f786f",
                           }}
                        >
                           {category.sport === "FOOTBALL"
                              ? "Futebol"
                              : category.sport === "FUTSAL"
                                 ? "Futsal"
                                 : "Futebol + Futsal"}
                           {category.type === "EVALUATION"
                              ? " · Avaliação"
                              : ""}
                        </small>
                     </div>

                     <strong>
                        {category.athleteCount}
                     </strong>
                  </Link>
               ))}
            </div>
         </div>
      </section>







      <section className="athletes-v4-search-card">

            <header className="athletes-v4-section-head">

               <div>

                  <span className="athletes-v4-eyebrow">

                     CENTRAL DE ATLETAS

                  </span>

                  <h2>Localizar atleta</h2>

                  <p>
                     Busque por nome e refine por categoria, posição
                     e elegibilidade.

                  </p>

               </div>



               <span className="athletes-v4-result-count">

                  {filteredAthletes.length} resultado(s)

               </span>

            </header>



            <form

               method="get"

               className="athletes-v4-filter-form"

            >

               <input

                  type="hidden"

                  name="view"

                  value={athleteView}

               />

               <label className="athletes-v4-search-field">

                  <span>Buscar atleta</span>

                  <div>

                     <Icon name="search" size={18} />

                     <input

                        name="q"

                        defaultValue={filters.q || ""}

                        placeholder="Nome ou apelido"

                     />

                  </div>

               </label>



               <label>

                  <span>Categoria</span>

                  <select

                     name="category"

                     defaultValue={categoryFilter}

                  >

                     <option value="ALL">Todas</option>



                     {categories.map((category) => (

                        <option

                           key={category.id}

                           value={category.id}

                        >

                           {category.type === "EVALUATION"
                              ? `Avaliação · ${category.name}`
                              : `${category.name} · ${
                                   category.sport === "FOOTBALL"
                                      ? "Futebol"
                                      : category.sport === "FUTSAL"
                                        ? "Futsal"
                                        : "Futebol + Futsal"
                                }`}

                        </option>

                     ))}



                     <option value="UNCATEGORIZED">

                        Sem categoria

                     </option>

                  </select>

               </label>



               <label>
                  <span>Modalidade</span>

                  <select
                     name="sport"
                     defaultValue={sportFilter}
                  >
                     <option value="ALL">Todas</option>
                     <option value="FOOTBALL">Futebol</option>
                     <option value="FUTSAL">Futsal</option>
                  </select>
               </label>



               <label>

                  <span>Posição</span>

                  <select

                     name="position"

                     defaultValue={positionFilter}

                  >

                     <option value="ALL">Todas</option>



                     {positions.map((position) => (

                        <option

                           key={position}

                           value={position}

                        >

                           {position}

                        </option>

                     ))}

                  </select>

               </label>



               <label>

                  <span>Elegibilidade</span>

                  <select

                     name="status"

                     defaultValue={statusFilter}

                  >

                     <option value="ALL">Todos</option>

                     <option value="APTO">Aptos</option>

                     <option value="INAPTO">Inaptos</option>

                  </select>

               </label>



               <button

                  type="submit"

                  className="athletes-v4-filter-button"

               >

                  Filtrar

               </button>



               {hasFilters ? (

                  <Link

                     className="athletes-v4-clear"

                     href={

                        athleteView === "ELENCO"

                           ? "/atletas"

                           : `/atletas?view=${athleteView}`

                     }

                  >

                     Limpar

                  </Link>

               ) : null}

            </form>

         </section>



         {!canEdit ? (

            <section className="athletes-v4-readonly">

               <span className="athletes-v4-eyebrow">

                  SOMENTE VISUALIZAÇÃO

               </span>

               <strong>Elenco do clube</strong>

               <p>

                  Dados privados da família permanecem restritos

                  à gestão autorizada.

               </p>

            </section>

         ) : null}



         <section
            className="athletes-v4-roster"
            style={{
               display: showAthleteList ? undefined : "none",
            }}
         >

            <header className="athletes-v4-roster-head">

               <div>

                  <span className="athletes-v4-eyebrow">

                     {athleteView === "ELENCO"

                        ? "ELENCO"

                        : athleteView === "EVALUATION"

                           ? "AVALIAÇÃO"

                           : athleteView === "REJECTED"

                              ? "ATLETAS REPROVADOS"

                              : athleteView === "RELEASED"

                                 ? "ATLETAS LIBERADOS"

                                 : athleteView === "WITHDRAWN"

                                    ? "DESISTÊNCIAS"

                                    : athleteView === "INACTIVE"

                                       ? "INATIVOS"

                                       : "TODOS OS ATLETAS"}

                  </span>

                  <h2>

                     {athleteView === "REJECTED"

                        ? "Atletas reprovados"

                        : athleteView === "RELEASED"

                           ? "Atletas liberados"

                           : athleteView === "WITHDRAWN"

                              ? "Atletas que desistiram"

                              : athleteView === "EVALUATION"

                                 ? "Atletas em avaliação"

                                 : athleteView === "INACTIVE"

                                    ? "Atletas inativos"

                                    : athleteView === "ALL"

                                       ? "Todos os atletas"

                                       : "Atletas do elenco"}

                  </h2>

               </div>



               <span>

                  Exibindo{" "}

                  {filteredAthletes.length

                     ? pageStart + 1

                     : 0}

                  –{" "}

                  {Math.min(

                     pageStart + PAGE_SIZE,

                     filteredAthletes.length,

                  )}{" "}

                  de {filteredAthletes.length}

               </span>

            </header>



            {pageAthletes.length ? (

               <>

                  <div className="athletes-v4-table-head">

                     <span>Atleta</span>

                     <span>Categoria</span>

                     <span>Posição</span>

                     <span>Idade</span>

                     <span>Documentação</span>

                     <span>Avaliações</span>

                     <span>Status</span>

                     <span aria-hidden="true" />

                  </div>



                  <div className="athletes-v4-list">

                     {pageAthletes.map((athlete) => {

                        const playerLinked =

                           athlete.playerLinks.some(

                              (link) => link.verified,

                           );



                        const activeDocuments =

                           athlete.documents.filter(

                              (document) =>

                                 document.status !== "ARCHIVED",

                           );



                        const hasNoDocuments =

                           activeDocuments.length === 0;



                        const expiredDocuments =

                           activeDocuments.filter(

                              (document) =>

                                 document.status === "EXPIRED" ||

                                 Boolean(

                                    document.expiresAt &&

                                       document.expiresAt < now,

                                 ),

                           ).length;



                        const pendingDocuments =

                           activeDocuments.filter(

                              (document) =>

                                 document.status === "PENDING",

                           ).length;



                        const rejectedDocuments =

                           activeDocuments.filter(

                              (document) =>

                                 document.status === "REJECTED",

                           ).length;



                        const hasPendingRequest =

                           athlete.registrationRequests.some(

                              (request) =>

                                 request.status === "PENDING" &&

                                 request.expiresAt >= now,

                           );



                        const documentationConfirmedAt =

                           athlete.documentationConfirmedAt;



                        const hasDocumentsAfterConfirmation =

                           documentationConfirmedAt

                              ? activeDocuments.some(

                                    (document) =>

                                       document.createdAt >

                                       documentationConfirmedAt,

                                 )

                              : false;



                        const documentationInDay =

                           Boolean(documentationConfirmedAt) &&

                           activeDocuments.length > 0 &&

                           pendingDocuments === 0 &&

                           rejectedDocuments === 0 &&

                           expiredDocuments === 0 &&

                           !hasPendingRequest &&

                           !hasDocumentsAfterConfirmation;



                        const documentStatusLabel =

                           expiredDocuments > 0

                              ? "Documento vencido"

                              : pendingDocuments > 0 ||

                                    rejectedDocuments > 0

                                 ? documentationConfirmedAt

                                    ? "Novo documento"

                                    : "Aguardando conferência"

                                 : hasPendingRequest

                                    ? "Documentos solicitados"

                                    : hasNoDocuments

                                       ? "Faltam documentos"

                                       : documentationInDay

                                          ? "Em dia"

                                          : hasDocumentsAfterConfirmation

                                             ? "Nova documentação"

                                             : "Aguardando confirmação";



                        const age = ageFromYear(

                           athlete.birthYear,

                        );



                        const athleteAccent =

                           athlete.category?.accentColor ||

                           "#9DDB16";



                        const athleteInEvaluation =

                           athlete.currentStatus === "EVALUATION";



                        const eligibility = athleteEligibility(athlete);

                        const eligibilityIssueCount = athlete.eligibilityIssues.length;



                        const currentStatusLabel =

                           athlete.currentStatus === "EVALUATION"

                              ? "Em avaliação"

                              : athlete.currentStatus === "REJECTED"

                                 ? "Reprovado"

                                 : athlete.currentStatus === "RELEASED"

                                    ? "Liberado"

                                    : "Ativo";



                        const currentStatusClass =

                           athlete.currentStatus === "EVALUATION"

                              ? "evaluation"

                              : athlete.currentStatus === "REJECTED"

                                 ? "rejected"

                                 : athlete.currentStatus === "RELEASED"

                                    ? "released"

                                    : "active";



                        const latestProcess =

                           athlete.evaluationProcesses[0] ?? null;



                        const categoryDisplay =

                           athlete.category?.name ||

                           ((athlete.currentStatus === "REJECTED" ||

                             athlete.currentStatus === "RELEASED") &&

                           latestProcess?.evaluationCategoryNameSnapshot

                              ? `Avaliação · ${latestProcess.evaluationCategoryNameSnapshot}`

                              : "Sem categoria");



                        return (

                           <article

                              className={`athletes-v4-row ${
                                 athlete.currentStatus === "REJECTED" ||
                                 athlete.currentStatus === "RELEASED"
                                    ? "inactive"
                                    : ""
                              }`}

                              key={athlete.id}

                           >

                              <Link

                                 href={`/atletas/${athlete.id}`}

                                 className="athletes-v4-person"

                              >

                                 <span

                                    className="athletes-v4-avatar"

                                    style={{

                                       borderColor: athleteAccent,

                                    }}

                                 >

                                    <SafeAvatar

                                       src={athlete.photoUrl}

                                       name={

                                          athlete.nickname ||

                                          athlete.name

                                       }

                                       alt={athlete.name}

                                    />

                                 </span>



                                 <div>

                                    <strong>

                                       {athlete.nickname ||

                                          athlete.name}

                                    </strong>



                                    {athlete.nickname ? (

                                       <small>{athlete.name}</small>

                                    ) : (

                                       <small>

                                          {playerLinked

                                             ? "11UP Player vinculado"

                                             : "Ficha do clube"}

                                       </small>

                                    )}

                                 </div>

                              </Link>



                              <div

                                 className="athletes-v4-cell"

                                 data-label="Categoria"

                              >

                                 <span

                                    className={`athletes-v4-category ${

                                       athleteInEvaluation

                                          ? "evaluation"

                                          : ""

                                    }`}

                                    style={{

                                       "--athlete-accent":

                                          athleteAccent,

                                    } as React.CSSProperties}

                                 >

                                    {categoryDisplay}

                                 </span>

                              </div>



                              <div

                                 className="athletes-v4-cell"

                                 data-label="Posição"

                              >

                                 <strong>

                                    {athlete.position || "—"}

                                 </strong>

                              </div>



                              <div

                                 className="athletes-v4-cell"

                                 data-label="Idade"

                              >

                                 <strong>

                                    {age ? `${age} anos` : "—"}

                                 </strong>

                              </div>



                              <div

                                 className="athletes-v4-cell"

                                 data-label="Documentação"

                              >

                                 <Link

                                    href={`/atletas/${athlete.id}/dados#documentos`}

                                    className={`athletes-v4-doc-status ${

                                       documentationInDay

                                          ? "ok"

                                          : "attention"

                                    }`}

                                 >

                                    <Icon

                                       name="file"

                                       size={15}

                                    />

                                    {documentStatusLabel}

                                 </Link>

                              </div>



                              <div

                                 className="athletes-v4-cell"

                                 data-label="Avaliações"

                              >

                                 <strong>

                                    {athlete.evaluations.length}

                                 </strong>

                              </div>



                              <div

                                 className="athletes-v4-cell"

                                 data-label="Status"

                              >

                                 <div className="athletes-v4-status-stack">

                                    <span className={`athletes-v4-status ${currentStatusClass}`}>

                                       {currentStatusLabel}

                                    </span>

                                    {eligibility ? (

                                       <span

                                          className={`athletes-v4-eligibility ${

                                             eligibility === "APTO" ? "apt" : "unfit"

                                          }`}

                                       >

                                          {eligibility === "APTO"

                                             ? "Apto"

                                             : `Inapto · ${eligibilityIssueCount} ${

                                                  eligibilityIssueCount === 1 ? "pendência" : "pendências"

                                               }`}

                                       </span>

                                    ) : null}

                                 </div>

                              </div>



                              <div className="athletes-v4-actions">

                                 <Link

                                    className="athletes-v4-open"

                                    href={`/atletas/${athlete.id}`}

                                 >

                                    Abrir

                                    <Icon

                                       name="arrow"

                                       size={14}

                                    />

                                 </Link>



                                 <details className="athletes-v4-more">

                                    <summary aria-label="Mais ações">

                                       ···

                                    </summary>



                                    <div>

                                       <Link

                                          href={`/atletas/${athlete.id}/dados`}

                                       >

                                          <Icon

                                             name="file"

                                             size={15}

                                          />

                                          Documentos

                                       </Link>



                                       <Link

                                          href={`/atletas/${athlete.id}/performance`}

                                       >

                                          <Icon

                                             name="performance"

                                             size={15}

                                          />

                                          Performance

                                       </Link>

                                    </div>

                                 </details>

                              </div>

                           </article>

                        );

                     })}

                  </div>



                  {totalPages > 1 ? (

                     <nav

                        className="athletes-v4-pagination"

                        aria-label="Paginação de atletas"

                     >

                        <Link

                           className={

                              currentPage === 1

                                 ? "disabled"

                                 : ""

                           }

                           aria-disabled={

                              currentPage === 1

                           }

                           href={

                              currentPage === 1

                                 ? athletesUrl({

                                       ...paginationBase,

                                       page: 1,

                                    })

                                 : athletesUrl({

                                       ...paginationBase,

                                       page: currentPage - 1,

                                    })

                           }

                        >

                           <Icon

                              name="chevron-left"

                              size={16}

                           />

                           Anterior

                        </Link>



                        <div>

                           {pageNumbers.map(

                              (page, index) => {

                                 const previous =

                                    pageNumbers[index - 1];



                                 return (

                                    <span key={page}>

                                       {previous &&

                                       page - previous > 1 ? (

                                          <i>…</i>

                                       ) : null}



                                       <Link

                                          className={

                                             page === currentPage

                                                ? "active"

                                                : ""

                                          }

                                          href={athletesUrl({

                                             ...paginationBase,

                                             page,

                                          })}

                                       >

                                          {page}

                                       </Link>

                                    </span>

                                 );

                              },

                           )}

                        </div>



                        <Link

                           className={

                              currentPage === totalPages

                                 ? "disabled"

                                 : ""

                           }

                           aria-disabled={

                              currentPage === totalPages

                           }

                           href={

                              currentPage === totalPages

                                 ? athletesUrl({

                                       ...paginationBase,

                                       page: totalPages,

                                    })

                                 : athletesUrl({

                                       ...paginationBase,

                                       page: currentPage + 1,

                                    })

                           }

                        >

                           Próxima

                           <Icon

                              name="chevron-right"

                              size={16}

                           />

                        </Link>

                     </nav>

                  ) : null}

               </>

            ) : (

               <div className="athletes-v4-empty">

                  <span>

                     <Icon

                        name="search"

                        size={23}

                     />

                  </span>

                  <strong>Nenhum atleta encontrado</strong>

                  <p>

                     Ajuste os filtros ou faça um novo cadastro.

                  </p>

               </div>

            )}

         </section>



         <style>{`

            .athletes-v4 {

               --athletes-ink: #07131d;

               --athletes-muted: #6f7f8b;

               --athletes-line: #dfe6ea;

               --athletes-panel: #ffffff;

               --athletes-lime: #99e600;

               --athletes-lime-soft: #eff9d8;

               --athletes-warning: #f4b418;

               --athletes-danger: #e34a4a;

               --athletes-info: #3b9bd7;

               display: grid;

               gap: 18px;

               padding: 28px 34px 44px;

               background:

                  radial-gradient(

                     circle at 92% 2%,

                     rgba(153, 230, 0, 0.075),

                     transparent 25rem

                  ),

                  #f4f7f8;

            }



            .athletes-v4 * {

               box-sizing: border-box;

            }



            .athletes-v4-hero {

               min-height: 194px;

               display: flex;

               align-items: center;

               justify-content: space-between;

               gap: 32px;

               padding: 30px 34px;

               overflow: hidden;

               position: relative;

               border: 1px solid rgba(255, 255, 255, 0.08);

               border-radius: 26px;

               color: #ffffff;

               background:

                  linear-gradient(

                     104deg,

                     rgba(5, 20, 31, 0.99) 0%,

                     rgba(6, 29, 37, 0.98) 58%,

                     rgba(20, 76, 30, 0.97) 100%

                  );

               box-shadow:

                  0 20px 45px

                  rgba(7, 19, 29, 0.12);

            }



            .athletes-v4-hero::after {

               content: "";

               width: 360px;

               height: 360px;

               position: absolute;

               right: -110px;

               top: -180px;

               border:

                  1px solid

                  rgba(153, 230, 0, 0.18);

               border-radius: 999px;

               box-shadow:

                  0 0 0 42px

                     rgba(153, 230, 0, 0.025),

                  0 0 0 84px

                     rgba(153, 230, 0, 0.018);

               pointer-events: none;

            }



            .athletes-v4-hero-copy,

            .athletes-v4-hero-actions {

               position: relative;

               z-index: 1;

            }



            .athletes-v4-eyebrow {

               display: block;

               margin-bottom: 8px;

               color: #79a900;

               font-size: 10px;

               font-weight: 900;

               line-height: 1.1;

               letter-spacing: 0.16em;

            }



            .athletes-v4-hero

               .athletes-v4-eyebrow {

               color: var(--athletes-lime);

               margin-bottom: 11px;

            }



            .athletes-v4-title-line {

               display: flex;

               align-items: center;

               gap: 18px;

            }



            .athletes-v4-title-icon {

               width: 54px;

               height: 54px;

               display: grid;

               place-items: center;

               flex: 0 0 54px;

               color: var(--athletes-lime);

               border:

                  1px solid

                  rgba(153, 230, 0, 0.28);

               border-radius: 16px;

               background:

                  rgba(153, 230, 0, 0.08);

            }



            .athletes-v4-title-line h1 {

               margin: 0;

               color: #ffffff !important;

               font-size:

                  clamp(34px, 4vw, 58px);

               line-height: 0.98;

               letter-spacing: -0.045em;

            }



            .athletes-v4-title-line p {

               max-width: 760px;

               margin: 12px 0 0;

               color:

                  rgba(255, 255, 255, 0.78);

               font-size: 16px;

            }



            .athletes-v4-hero-actions {

               min-width: 225px;

               display: grid;

               gap: 10px;

               padding: 12px;

               border:

                  1px solid

                  rgba(255, 255, 255, 0.08);

               border-radius: 18px;

               background:

                  rgba(4, 24, 35, 0.66);

               backdrop-filter: blur(8px);

            }



            .athletes-v4-primary-button {

               min-height: 48px;

               display: inline-flex;

               align-items: center;

               justify-content: center;

               gap: 8px;

               padding: 0 18px;

               border-radius: 12px;

               color: #07120a;

               background:

                  var(--athletes-lime);

               box-shadow:

                  0 10px 25px

                  rgba(153, 230, 0, 0.14);

               font-size: 14px;

               font-weight: 900;

               text-decoration: none;

            }



            .athletes-v4-help {

               min-width: 0;

            }



            .athletes-v4-help button,

            .athletes-v4-help a {

               width: 100%;

            }



            .athletes-v4-kpis {

               display: grid;

               grid-template-columns:

                  repeat(4, minmax(0, 1fr));

               gap: 14px;

            }



            .athletes-v4-kpis article {

               min-height: 124px;

               display: flex;

               align-items: flex-start;

               gap: 14px;

               padding: 20px;

               border:

                  1px solid

                  var(--athletes-line);

               border-radius: 19px;

               background:

                  var(--athletes-panel);

               box-shadow:

                  0 10px 30px

                  rgba(8, 26, 38, 0.045);

            }



            .athletes-v4-kpi-icon,

            .athletes-v4-create-icon {

               display: grid;

               place-items: center;

               flex: 0 0 auto;

               color: #719f00;

               background:

                  var(--athletes-lime-soft);

            }



            .athletes-v4-kpi-icon {

               width: 42px;

               height: 42px;

               border-radius: 12px;

            }



            .athletes-v4-kpi-icon.evaluation {

               color: #287eae;

               background: #e8f5fc;

            }



            .athletes-v4-kpi-icon.attention {

               color: #b77700;

               background: #fff3d2;

            }



            .athletes-v4-kpis article > div {

               display: grid;

            }



            .athletes-v4-kpis small {

               color: #72808b;

               font-size: 10px;

               font-weight: 900;

               letter-spacing: 0.12em;

            }



            .athletes-v4-kpis strong {

               margin-top: 2px;

               color: var(--athletes-ink);

               font-size: 31px;

               line-height: 1.05;

               letter-spacing: -0.04em;

            }



            .athletes-v4-kpis article

               div > span {

               margin-top: 3px;

               color:

                  var(--athletes-muted);

               font-size: 12px;

               font-weight: 700;

            }



            .athletes-v4-folders,




            .athletes-v4-category-tabs,
             .athletes-v4-subfolders {

               display: flex;

               align-items: center;

               gap: 8px;

               overflow-x: auto;

               padding: 4px 2px;

               scrollbar-width: thin;

            }



            .athletes-v4-folders a,




            .athletes-v4-category-tabs a,
             .athletes-v4-subfolders a {

               min-height: 42px;

               display: inline-flex;

               align-items: center;

               gap: 8px;

               flex: 0 0 auto;

               padding: 0 13px;

               border: 1px solid var(--athletes-line);

               border-radius: 12px;

               color: #586974;

               background: #ffffff;

               font-size: 11px;

               font-weight: 900;

               text-decoration: none;

               box-shadow: 0 6px 18px rgba(8, 26, 38, .03);

            }



            .athletes-v4-folders a strong,




            .athletes-v4-category-tabs a strong,
             .athletes-v4-subfolders a strong {

               min-width: 22px;

               height: 22px;

               display: inline-flex;

               align-items: center;

               justify-content: center;

               padding: 0 6px;

               border-radius: 999px;

               color: #667680;

               background: #eef2f4;

               font-size: 9px;

            }



            .athletes-v4-folders a.active,




            .athletes-v4-category-tabs a.active,
             .athletes-v4-subfolders a.active {

               border-color: var(--athletes-lime);

               color: #10200a;

               background: var(--athletes-lime-soft);

            }



            .athletes-v4-folders a.active strong,




            .athletes-v4-category-tabs a.active strong,
             .athletes-v4-subfolders a.active strong {

               color: #10200a;

               background: var(--athletes-lime);

            }

             .athletes-v4-category-tabs {
                padding: 6px 2px 2px;
             }

             .athletes-v4-category-tabs a {
                min-height: 40px;
                padding: 0 14px;
                text-transform: none;
             }

             .athletes-v4-category-tabs a.evaluation {
                border-style: dashed;
             }

             .athletes-v4-category-tabs a.evaluation.active {
                border-style: solid;
                border-color: #9fd8f7;
                color: #165d86;
                background: #eaf7fd;
             }

             .athletes-v4-category-tabs a.evaluation.active strong {
                color: #165d86;
                background: #bfe8fb;
             }




            .athletes-v4-subfolders {

               padding-left: 12px;

            }



            .athletes-v4-subfolders a {

               min-height: 36px;

               padding: 0 11px;

               font-size: 10px;

            }



            .athletes-v4-create,

            .athletes-v4-search-card,

            .athletes-v4-roster,

            .athletes-v4-readonly {

               border:

                  1px solid

                  var(--athletes-line);

               border-radius: 20px;

               background: #ffffff;

               box-shadow:

                  0 10px 30px

                  rgba(8, 26, 38, 0.04);

            }



            .athletes-v4-create {

               overflow: hidden;

            }



            .athletes-v4-create > summary {

               min-height: 108px;

               display: flex;

               align-items: center;

               justify-content: space-between;

               gap: 18px;

               padding: 20px 24px;

               cursor: pointer;

               list-style: none;

            }



            .athletes-v4-create

               > summary::-webkit-details-marker {

               display: none;

            }



            .athletes-v4-create-copy {

               display: flex;

               align-items: center;

               gap: 14px;

            }



            .athletes-v4-create-icon {

               width: 44px;

               height: 44px;

               border-radius: 13px;

            }



            .athletes-v4-create-copy h2,

            .athletes-v4-section-head h2,

            .athletes-v4-roster-head h2 {

               margin: 0;

               color: var(--athletes-ink);

               letter-spacing: -0.03em;

            }



            .athletes-v4-create-copy h2 {

               font-size: 21px;

            }



            .athletes-v4-create-copy p {

               margin: 5px 0 0;

               color:

                  var(--athletes-muted);

               font-size: 12px;

            }



            .athletes-v4-open-create {

               min-height: 40px;

               display: inline-flex;

               align-items: center;

               gap: 6px;

               padding: 0 13px;

               border-radius: 11px;

               color: #638e00;

               background:

                  var(--athletes-lime-soft);

               font-size: 11px;

               font-weight: 900;

            }



            .athletes-v4-create-body {

               padding: 0 24px 24px;

               border-top:

                  1px solid

                  #edf1f3;

            }



            .athletes-v4-search-card {

               padding: 20px;

            }



            .athletes-v4-section-head,

            .athletes-v4-roster-head {

               display: flex;

               align-items: flex-end;

               justify-content: space-between;

               gap: 18px;

            }



            .athletes-v4-section-head {

               margin-bottom: 16px;

            }



            .athletes-v4-section-head h2,

            .athletes-v4-roster-head h2 {

               font-size: 23px;

            }



            .athletes-v4-section-head p {

               margin: 5px 0 0;

               color:

                  var(--athletes-muted);

               font-size: 12px;

            }



            .athletes-v4-result-count,

            .athletes-v4-roster-head > span {

               flex: 0 0 auto;

               color: #6c7b86;

               font-size: 11px;

               font-weight: 800;

            }



            .athletes-v4-result-count {

               padding: 8px 11px;

               border-radius: 999px;

               background: #f2f5f6;

            }



            .athletes-v4-filter-form {

               display: grid;

               grid-template-columns:

                  minmax(250px, 1.55fr)

                  minmax(160px, 1fr)

                  minmax(140px, .8fr)

                  minmax(130px, .75fr)

                  auto auto;

               align-items: end;

               gap: 10px;

            }



            .athletes-v4-filter-form label {

               min-width: 0;

               display: grid;

               gap: 6px;

               color: #465561;

               font-size: 11px;

               font-weight: 900;

            }



            .athletes-v4-search-field > div {

               min-height: 44px;

               display: flex;

               align-items: center;

               gap: 8px;

               padding: 0 12px;

               border: 1px solid #d9e2e7;

               border-radius: 12px;

               color: #71808b;

               background: #ffffff;

            }



            .athletes-v4-search-field input {

               width: 100%;

               border: 0;

               outline: 0;

               color: #101820;

               background: transparent;

               font-size: 13px;

               font-weight: 700;

            }



            .athletes-v4-filter-form select {

               min-height: 44px;

               padding:

                  0 36px 0 12px;

               border:

                  1px solid

                  #d9e2e7;

               border-radius: 12px;

               outline: none;

               color: #101820;

               background: #ffffff;

               font-size: 13px;

               font-weight: 700;

            }



            .athletes-v4-search-field > div:focus-within,

            .athletes-v4-filter-form select:focus {

               border-color: #94d700;

               box-shadow:

                  0 0 0 3px

                  rgba(153, 230, 0, 0.12);

            }



            .athletes-v4-filter-button,

            .athletes-v4-clear {

               min-height: 44px;

               display: inline-flex;

               align-items: center;

               justify-content: center;

               padding: 0 15px;

               border:

                  1px solid

                  #d9e2e7;

               border-radius: 12px;

               color:

                  var(--athletes-ink);

               background: #f8fafb;

               font-size: 12px;

               font-weight: 900;

               text-decoration: none;

               cursor: pointer;

            }



            .athletes-v4-clear {

               color: #6b7b86;

               background: transparent;

            }



            .athletes-v4-readonly {

               padding: 18px 20px;

            }



            .athletes-v4-readonly strong {

               display: block;

               color: var(--athletes-ink);

               font-size: 15px;

            }



            .athletes-v4-readonly p {

               margin: 4px 0 0;

               color:

                  var(--athletes-muted);

               font-size: 12px;

            }



            .athletes-v4-roster {

               overflow: visible;

               padding: 20px;

            }



            .athletes-v4-roster-head {

               margin-bottom: 15px;

            }



            .athletes-v4-table-head,

            .athletes-v4-row {

               display: grid;

               grid-template-columns:

                  minmax(240px, 1.8fr)

                  minmax(120px, 1fr)

                  minmax(95px, .75fr)

                  minmax(75px, .55fr)

                  minmax(165px, 1.2fr)

                  minmax(80px, .55fr)

                  minmax(90px, .65fr)

                  126px;

               gap: 12px;

               align-items: center;

            }



            .athletes-v4-table-head {

               min-height: 38px;

               padding: 0 14px;

               border-top:

                  1px solid

                  #e8edef;

               border-bottom:

                  1px solid

                  #e8edef;

               color: #75848e;

               background: #f7f9fa;

               font-size: 9px;

               font-weight: 900;

               letter-spacing: 0.09em;

               text-transform: uppercase;

            }



            .athletes-v4-list {

               position: relative;

            }



            .athletes-v4-row {

               min-height: 78px;

               padding: 10px 14px;

               border-bottom:

                  1px solid

                  #e9eef0;

               background: #ffffff;

            }



            .athletes-v4-row:last-child {

               border-bottom: 0;

            }



            .athletes-v4-row:hover {

               position: relative;

               z-index: 1;

               border-radius: 12px;

               background: #fbfcfc;

               box-shadow:

                  0 5px 18px

                  rgba(7, 19, 29, .04);

            }



            .athletes-v4-row\.inactive {

               opacity: .62;

            }



            .athletes-v4-person {

               min-width: 0;

               display: flex;

               align-items: center;

               gap: 11px;

               color: inherit;

               text-decoration: none;

            }



            .athletes-v4-avatar {

               width: 44px;

               height: 44px;

               flex: 0 0 44px;

               overflow: hidden;

               border: 2px solid #9ddb16;

               border-radius: 13px;

               background: #eef2f4;

            }



            .athletes-v4-avatar img {

               width: 100%;

               height: 100%;

               display: block;

               object-fit: cover;

            }



            .athletes-v4-person > div {

               min-width: 0;

               display: grid;

               gap: 2px;

            }



            .athletes-v4-person strong {

               overflow: hidden;

               color:

                  var(--athletes-ink);

               font-size: 13px;

               text-overflow: ellipsis;

               white-space: nowrap;

            }



            .athletes-v4-person small {

               overflow: hidden;

               color: #7a8993;

               font-size: 10px;

               text-overflow: ellipsis;

               white-space: nowrap;

            }



            .athletes-v4-cell {

               min-width: 0;

               color: #34444f;

               font-size: 11px;

            }



            .athletes-v4-cell > strong {

               font-size: 11px;

            }



            .athletes-v4-category {

               display: inline-flex;

               align-items: center;

               max-width: 100%;

               min-height: 28px;

               padding: 0 9px;

               overflow: hidden;

               border-radius: 999px;

               color: #42515b;

               background: #f0f3f4;

               font-size: 10px;

               font-weight: 900;

               text-overflow: ellipsis;

               white-space: nowrap;

            }



            .athletes-v4-category::before {

               content: "";

               width: 7px;

               height: 7px;

               flex: 0 0 7px;

               margin-right: 6px;

               border-radius: 999px;

               background:

                  var(

                     --athlete-accent,

                     #9ddb16

                  );

            }



            .athletes-v4-category.evaluation {

               color: #1d6288;

               background: #eaf5fb;

            }



            .athletes-v4-doc-status {

               min-width: 0;

               display: inline-flex;

               align-items: center;

               gap: 5px;

               color: #64747f;

               font-size: 10px;

               font-weight: 800;

               text-decoration: none;

            }



            .athletes-v4-doc-status.ok {

               color: #638e00;

            }



            .athletes-v4-doc-status.attention {

               color: #a97100;

            }



            .athletes-v4-status-stack {

               display: grid;

               justify-items: start;

               gap: 5px;

            }



            .athletes-v4-eligibility {

               display: inline-flex;

               align-items: center;

               min-height: 22px;

               padding: 0 8px;

               border-radius: 999px;

               font-size: 9px;

               font-weight: 900;

               white-space: nowrap;

            }



            .athletes-v4-eligibility.apt {

               color: #4f7300;

               background: #eff9d8;

            }



            .athletes-v4-eligibility.unfit {

               color: #9b5a00;

               background: #fff1d6;

            }



            .athletes-v4-status {

               min-height: 27px;

               display: inline-flex;

               align-items: center;

               padding: 0 9px;

               border-radius: 999px;

               font-size: 9px;

               font-weight: 900;

            }



            .athletes-v4-status.active {

               color: #527900;

               background:

                  var(--athletes-lime-soft);

            }



            .athletes-v4-status.evaluation {

               color: #256e97;

               background: #e6f4fb;

            }



            .athletes-v4-status.inactive {

               color: #6f7c84;

               background: #edf1f3;

            }



            .athletes-v4-status.rejected {

               color: #b91c1c;

               background: #fee2e2;

            }



            .athletes-v4-status.released {

               color: #c2410c;

               background: #ffedd5;

            }



            .athletes-v4-status.withdrawn {

               color: #475569;

               background: #e2e8f0;

            }



            .athletes-v4-actions {

               position: relative;

               display: flex;

               align-items: center;

               justify-content: flex-end;

               gap: 7px;

            }



            .athletes-v4-open {

               min-height: 34px;

               display: inline-flex;

               align-items: center;

               gap: 5px;

               padding: 0 10px;

               border-radius: 9px;

               color: #587e00;

               background:

                  var(--athletes-lime-soft);

               font-size: 10px;

               font-weight: 900;

               text-decoration: none;

            }



            .athletes-v4-more {

               position: relative;

            }



            .athletes-v4-more > summary {

               width: 34px;

               height: 34px;

               display: grid;

               place-items: center;

               border:

                  1px solid

                  #dce4e8;

               border-radius: 9px;

               color: #65747e;

               background: #fafbfb;

               cursor: pointer;

               list-style: none;

               font-size: 16px;

               font-weight: 900;

            }



            .athletes-v4-more

               > summary::-webkit-details-marker {

               display: none;

            }



            .athletes-v4-more > div {

               width: 174px;

               display: grid;

               gap: 3px;

               position: absolute;

               z-index: 20;

               right: 0;

               top: 40px;

               padding: 6px;

               border:

                  1px solid

                  #dce4e8;

               border-radius: 12px;

               background: #ffffff;

               box-shadow:

                  0 14px 35px

                  rgba(7, 19, 29, .14);

            }



            .athletes-v4-more a,

            .athletes-v4-more button {

               width: 100%;

               min-height: 34px;

               display: flex;

               align-items: center;

               gap: 7px;

               padding: 0 9px;

               border: 0;

               border-radius: 8px;

               color: #32434e;

               background: transparent;

               font: inherit;

               font-size: 10px;

               font-weight: 800;

               text-align: left;

               text-decoration: none;

               cursor: pointer;

            }



            .athletes-v4-more a:hover,

            .athletes-v4-more button:hover {

               background: #f4f7f8;

            }



            .athletes-v4-more button.danger {

               color: #c63b3b;

            }



            .athletes-v4-pagination {

               display: flex;

               align-items: center;

               justify-content: space-between;

               gap: 14px;

               padding-top: 18px;

               border-top:

                  1px solid

                  #edf1f3;

            }



            .athletes-v4-pagination > a,

            .athletes-v4-pagination div a {

               min-height: 36px;

               display: inline-flex;

               align-items: center;

               justify-content: center;

               gap: 5px;

               padding: 0 11px;

               border:

                  1px solid

                  #dce4e8;

               border-radius: 10px;

               color: #475863;

               background: #ffffff;

               font-size: 10px;

               font-weight: 900;

               text-decoration: none;

            }



            .athletes-v4-pagination

               > a.disabled {

               opacity: .35;

               pointer-events: none;

            }



            .athletes-v4-pagination div {

               display: flex;

               align-items: center;

               gap: 5px;

            }



            .athletes-v4-pagination div span {

               display: inline-flex;

               align-items: center;

               gap: 5px;

            }



            .athletes-v4-pagination div a {

               width: 36px;

               padding: 0;

            }



            .athletes-v4-pagination div a.active {

               border-color:

                  var(--athletes-lime);

               color: #0b1806;

               background:

                  var(--athletes-lime);

            }



            .athletes-v4-pagination div i {

               color: #81909a;

               font-style: normal;

               font-size: 12px;

            }



            .athletes-v4-empty {

               min-height: 190px;

               display: grid;

               place-items: center;

               align-content: center;

               gap: 7px;

               padding: 24px;

               border:

                  1px dashed

                  #d8e1e5;

               border-radius: 14px;

               color: #7a8994;

               background: #fafcfc;

               text-align: center;

            }



            .athletes-v4-empty > span {

               width: 46px;

               height: 46px;

               display: grid;

               place-items: center;

               border-radius: 13px;

               color: #759f0d;

               background:

                  var(--athletes-lime-soft);

            }



            .athletes-v4-empty strong {

               color:

                  var(--athletes-ink);

               font-size: 14px;

            }



            .athletes-v4-empty p {

               margin: 0;

               font-size: 11px;

            }



            @media (max-width: 1260px) {

               .athletes-v4 {

                  padding: 24px;

               }



               .athletes-v4-filter-form {

                  grid-template-columns:

                     repeat(2, minmax(0, 1fr));

               }



               .athletes-v4-table-head,

               .athletes-v4-row {

                  grid-template-columns:

                     minmax(210px, 1.5fr)

                     minmax(120px, .8fr)

                     minmax(90px, .65fr)

                     minmax(145px, 1fr)

                     minmax(85px, .6fr)

                     122px;

               }



               .athletes-v4-table-head

                  > :nth-child(4),

               .athletes-v4-row

                  > :nth-child(4),

               .athletes-v4-table-head

                  > :nth-child(6),

               .athletes-v4-row

                  > :nth-child(6) {

                  display: none;

               }

            }



            @media (max-width: 980px) {

               .athletes-v4-hero {

                  align-items: flex-start;

                  flex-direction: column;

               }



               .athletes-v4-hero-actions {

                  width: 100%;

               }



               .athletes-v4-kpis {

                  grid-template-columns:

                     repeat(2, minmax(0, 1fr));

               }



               .athletes-v4-table-head {

                  display: none;

               }



               .athletes-v4-list {

                  display: grid;

                  gap: 10px;

               }



               .athletes-v4-row {

                  grid-template-columns:

                     minmax(220px, 1.4fr)

                     minmax(120px, .8fr)

                     minmax(100px, .65fr)

                     minmax(150px, 1fr)

                     minmax(90px, .6fr)

                     122px;

                  border:

                     1px solid

                     #e1e7ea;

                  border-radius: 14px;

               }



               .athletes-v4-row

                  > :nth-child(4),

               .athletes-v4-row

                  > :nth-child(6) {

                  display: none;

               }

            }



            @media (max-width: 760px) {

               .athletes-v4 {

                  gap: 14px;

                  padding: 16px 12px 32px;

               }



               .athletes-v4-hero {

                  min-height: auto;

                  padding: 24px 20px;

                  border-radius: 20px;

               }



               .athletes-v4-title-line {

                  align-items: flex-start;

               }



               .athletes-v4-title-icon {

                  width: 44px;

                  height: 44px;

                  flex-basis: 44px;

               }



               .athletes-v4-title-line h1 {

                  font-size: 34px;

               }



               .athletes-v4-title-line p {

                  font-size: 13px;

               }



               .athletes-v4-kpis {

                  grid-template-columns:

                     1fr 1fr;

               }



               .athletes-v4-kpis article {

                  min-height: 108px;

                  gap: 10px;

                  padding: 15px;

               }



               .athletes-v4-kpi-icon {

                  width: 36px;

                  height: 36px;

               }



               .athletes-v4-kpis strong {

                  font-size: 25px;

               }



               .athletes-v4-create

                  > summary {

                  align-items: flex-start;

                  flex-direction: column;

               }



               .athletes-v4-open-create {

                  width: 100%;

                  justify-content: center;

               }



               .athletes-v4-section-head,

               .athletes-v4-roster-head {

                  align-items: flex-start;

                  flex-direction: column;

               }



               .athletes-v4-filter-form {

                  grid-template-columns: 1fr;

               }



               .athletes-v4-row {

                  grid-template-columns:

                     minmax(0, 1fr) auto;

                  gap: 10px;

                  padding: 14px;

               }



               .athletes-v4-person {

                  grid-column: 1;

               }



               .athletes-v4-row

                  > .athletes-v4-cell {

                  display: flex !important;

                  align-items: center;

                  justify-content: space-between;

                  grid-column: 1 / -1;

                  min-height: 30px;

                  padding-top: 7px;

                  border-top:

                     1px solid

                     #edf1f3;

               }



               .athletes-v4-cell::before {

                  content:

                     attr(data-label);

                  color: #81909a;

                  font-size: 9px;

                  font-weight: 900;

                  letter-spacing: .08em;

                  text-transform: uppercase;

               }



               .athletes-v4-actions {

                  grid-column: 2;

                  grid-row: 1;

                  align-self: center;

               }



               .athletes-v4-pagination {

                  align-items: stretch;

                  flex-direction: column;

               }



               .athletes-v4-pagination

                  > a {

                  width: 100%;

               }



               .athletes-v4-pagination div {

                  justify-content: center;

               }

            }



            @media (max-width: 520px) {

               .athletes-v4-title-icon {

                  display: none;

               }



               .athletes-v4-kpis {

                  grid-template-columns: 1fr;

               }



               .athletes-v4-create-copy {

                  align-items: flex-start;

               }



               .athletes-v4-create-icon {

                  display: none;

               }

            }



            /* Correção 07: janela de cadastro, sem rolagem inesperada. */
            .athletes-v4-create-dialog {
               width: min(940px, calc(100vw - 32px));
               max-width: 940px;
               max-height: calc(100dvh - 32px);
               padding: 0;
               border: 1px solid #dfe6ea;
               border-radius: 20px;
               color: #07131d;
               background: #fff;
               box-shadow: 0 28px 80px rgba(7,19,29,.32);
               overflow-y: auto;
               overscroll-behavior: contain;
            }
            .athletes-v4-create-dialog::backdrop {
               background: rgba(4,14,24,.68);
               backdrop-filter: blur(3px);
            }
            .athletes-v4-create-dialog-head {
               position: sticky;
               top: 0;
               z-index: 2;
               display: flex;
               align-items: flex-start;
               justify-content: space-between;
               gap: 16px;
               padding: 22px 24px;
               border-bottom: 1px solid #e8edf0;
               background: #fff;
            }
            .athletes-v4-create-dialog-head h2 {
               margin: 4px 0 0;
               font-size: clamp(22px, 3vw, 28px);
               line-height: 1.15;
               color: #07131d;
            }
            .athletes-v4-create-dialog-head p {
               margin: 8px 0 0;
               font-size: 13px;
               line-height: 1.5;
               color: #647583;
            }
            .athletes-v4-create-dialog-close {
               flex: 0 0 38px;
               width: 38px;
               height: 38px;
               border: 1px solid #dfe6ea;
               border-radius: 11px;
               background: #f3f6f7;
               color: #07131d;
               font-size: 25px;
               line-height: 1;
               cursor: pointer;
            }
            .athletes-v4-create-dialog .athletes-v4-create-body {
               padding: 24px;
               border: 0;
            }
            .athletes-v4-hero-actions > .athletes-v4-primary-button {
               border: 0;
               cursor: pointer;
               font-family: inherit;
            }
            @media (max-width: 520px) {
               .athletes-v4-create-dialog {
                  width: calc(100vw - 16px);
                  max-height: calc(100dvh - 16px);
                  border-radius: 15px;
               }
               .athletes-v4-create-dialog-head { padding: 16px; }
               .athletes-v4-create-dialog .athletes-v4-create-body { padding: 16px; }
            }
         `}</style>

      </div>

   );

}
