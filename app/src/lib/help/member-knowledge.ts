/**
 * #49: grounded, member-type-aware Help (ported from the Captiva portal chat).
 * Every answer comes from these topics (plus the published FAQ). Each topic has text in EN/ES/DE/JA
 * and multilingual keys so the no-model fallback still finds it in any language.
 */
import type { Locale } from "@/lib/i18n/messages";

type L4 = { en: string; es: string; de: string; ja: string };
export type Audience = "developer" | "member" | "all";
export type MemberTopic = { id: string; audience: Audience; title: L4; body: L4; keys: string[] };

export const MEMBER_TOPICS: MemberTopic[] = [
  {
    id: "ledger-member",
    audience: "member",
    title: { en: "Your Ledger", es: "Su Ledger", de: "Ihr Ledger", ja: "あなたの Ledger" },
    body: {
      en: "The [Ledger](/feed) shows how many approved projects need your category right now, their total value, and how many developers want to talk to you. Below that are Opportunities for you (New and Closes soon tags), My work right now (Active and In talks), and a This month strip with projects shown, developer profile views and deals won.",
      es: "El [Ledger](/feed) muestra cuántos proyectos aprobados necesitan su categoría ahora, su valor total y cuántos desarrolladores quieren hablar con usted. Debajo están Oportunidades para usted (etiquetas Nuevo y Cierra pronto), Mi trabajo ahora (Activo y En conversación) y la franja Este mes con proyectos mostrados, visitas de desarrolladores y acuerdos ganados.",
      de: "Das [Ledger](/feed) zeigt, wie viele freigegebene Projekte Ihre Kategorie gerade brauchen, ihren Gesamtwert und wie viele Entwickler mit Ihnen sprechen möchten. Darunter: Chancen für Sie (Neu und Endet bald), Meine aktuelle Arbeit (Aktiv und In Gesprächen) und die Leiste Diesen Monat mit gezeigten Projekten, Profilaufrufen von Entwicklern und gewonnenen Aufträgen.",
      ja: "[Ledger](/feed) には、今あなたのカテゴリーを必要とする承認済みプロジェクトの数、総額、話したいデベロッパーの数が表示されます。その下に「あなたへの案件」（新着・締切間近）、「現在の仕事」（進行中・交渉中）、今月の実績（表示された案件、デベロッパーの閲覧、成約）があります。",
    },
    keys: ["ledger", "home", "dashboard", "opportunit", "headline", "this month", "inicio", "oportunidad", "startseite", "chancen", "ホーム", "案件", "レジャー"],
  },
  {
    id: "express-interest",
    audience: "member",
    title: { en: "Express interest in a project", es: "Mostrar interés en un proyecto", de: "Interesse an einem Projekt zeigen", ja: "プロジェクトに関心を伝える" },
    body: {
      en: "Open a project from Opportunities for you on the [Ledger](/feed) and press Express interest. The developer gets your request; it shows as Pending under In talks. When the developer accepts, the project moves to Active and you can message them in [Messages](/messages).",
      es: "Abra un proyecto en Oportunidades para usted del [Ledger](/feed) y pulse Mostrar interés. El desarrollador recibe su solicitud; aparece como Pendiente en En conversación. Cuando la acepta, el proyecto pasa a Activo y puede escribirle en [Mensajes](/messages).",
      de: "Öffnen Sie ein Projekt unter Chancen für Sie im [Ledger](/feed) und tippen Sie auf Interesse zeigen. Der Entwickler erhält Ihre Anfrage; sie steht als Ausstehend unter In Gesprächen. Nimmt er an, wechselt das Projekt zu Aktiv und Sie können ihm unter [Nachrichten](/messages) schreiben.",
      ja: "[Ledger](/feed) の「あなたへの案件」からプロジェクトを開き、「関心を伝える」を押します。デベロッパーにリクエストが届き、「交渉中」に保留中と表示されます。承認されると「進行中」に移り、[メッセージ](/messages)でやり取りできます。",
    },
    keys: ["express interest", "interest", "contact a project", "apply to project", "bid", "pending", "interés", "interesse", "関心", "入札"],
  },
  {
    id: "getting-started-member",
    audience: "member",
    title: { en: "Getting started", es: "Primeros pasos", de: "Erste Schritte", ja: "はじめに" },
    body: {
      en: "Getting started runs in order: accept the [Member NDA](/member-nda), complete your [profile](/profile) (with your {credential} if your type needs it), add past work on your [profile](/profile#past-work), add a profile photo, then contact a project seeking your category. If nothing is seeking your category yet, you're first in line: the last step completes itself and we alert you the moment a developer posts one.",
      es: "Primeros pasos va en orden: acepte el [NDA de miembros](/member-nda), complete su [perfil](/profile) (con su {credential} si su tipo lo requiere), añada trabajos anteriores en su [perfil](/profile#past-work), añada una foto y contacte un proyecto que busque su categoría. Si todavía no hay ninguno, usted es el primero en la fila: el último paso se completa solo y le avisaremos en cuanto un desarrollador publique uno.",
      de: "Erste Schritte laufen der Reihe nach: [Mitglieder-NDA](/member-nda) akzeptieren, [Profil](/profile) vervollständigen (mit {credential}, falls für Ihren Typ nötig), frühere Arbeiten im [Profil](/profile#past-work) hinzufügen, Profilfoto hinzufügen, dann ein Projekt kontaktieren, das Ihre Kategorie sucht. Gibt es noch keines, sind Sie als Erste dran: Der letzte Schritt erledigt sich selbst, und wir benachrichtigen Sie, sobald ein Entwickler eines einstellt.",
      ja: "はじめには順番に進みます：[会員NDA](/member-nda)に同意、[プロフィール](/profile)を完成（必要な種別は {credential} も）、[プロフィール](/profile#past-work)に過去の実績を追加、プロフィール写真を追加、そしてあなたのカテゴリーを求めるプロジェクトに連絡します。まだ該当がない場合はあなたが最優先です。最後のステップは自動で完了し、デベロッパーが掲載したらすぐにお知らせします。",
    },
    keys: ["getting started", "checklist", "steps", "next step", "what next", "nda", "primeros pasos", "siguiente", "erste schritte", "nächste", "はじめに", "次", "ステップ"],
  },
  {
    id: "past-work",
    audience: "member",
    title: { en: "Past work", es: "Trabajos anteriores", de: "Frühere Arbeiten", ja: "過去の実績" },
    body: {
      en: "Past projects live on your profile under [Past work](/profile#past-work). Use Add past work to show a finished job. Past work is for showing experience only; it is not matched or sent to anyone.",
      es: "Los proyectos anteriores están en su perfil en [Trabajos anteriores](/profile#past-work). Use Añadir trabajo anterior para mostrar una obra terminada. Solo muestra experiencia; no se empareja ni se envía a nadie.",
      de: "Frühere Projekte stehen in Ihrem Profil unter [Frühere Arbeiten](/profile#past-work). Mit Frühere Arbeit hinzufügen zeigen Sie ein abgeschlossenes Projekt. Das zeigt nur Erfahrung; es wird nicht zugeordnet oder verschickt.",
      ja: "過去のプロジェクトはプロフィールの[過去の実績](/profile#past-work)にあります。「過去の実績を追加」で完了した案件を載せられます。経験を示すためのもので、マッチングや送信はされません。",
    },
    keys: ["past work", "past project", "portfolio", "add project", "trabajo anterior", "portafolio", "frühere", "referenz", "実績", "過去"],
  },
  {
    id: "insurance",
    audience: "member",
    title: { en: "Insurance on your profile", es: "Seguros en su perfil", de: "Versicherung im Profil", ja: "プロフィールの保険" },
    body: {
      en: "On your [profile](/profile), under Insurance, check each coverage you carry (general liability, umbrella, builder's risk, workers' comp, commercial auto, professional, pollution, surety capacity, or Other) and add the dollar limit. Developers see a short summary such as General liability $2M / $4M.",
      es: "En su [perfil](/profile), en Seguros, marque cada cobertura que tiene (responsabilidad general, umbrella, todo riesgo construcción, accidentes laborales, auto comercial, profesional, contaminación, fianzas u Otro) y añada el límite en dólares. Los desarrolladores ven un resumen, por ejemplo Responsabilidad civil general $2M / $4M.",
      de: "Markieren Sie in Ihrem [Profil](/profile) unter Versicherung jede Deckung (Betriebshaftpflicht, Umbrella, Bauleistung, Arbeitsunfall, Kfz, Berufshaftpflicht, Umwelt, Kautionsrahmen oder Sonstiges) und geben Sie das Limit in Dollar an. Entwickler sehen eine Kurzfassung wie Betriebshaftpflicht $2M / $4M.",
      ja: "[プロフィール](/profile)の保険欄で、加入している補償（一般賠償、アンブレラ、建設工事、労災、事業用自動車、専門職、汚染、保証ボンド枠、その他）にチェックし、限度額をドルで入力します。デベロッパーには「一般賠償責任 $2M / $4M」のような要約が表示されます。",
    },
    keys: ["insurance", "coverage", "liability", "limit", "seguro", "cobertura", "versicherung", "deckung", "保険", "補償"],
  },
  {
    id: "refer",
    audience: "all",
    title: { en: "Refer a colleague", es: "Recomendar a un colega", de: "Kollegen empfehlen", ja: "同僚を紹介する" },
    body: {
      en: "Use [Refer a colleague](/refer) in the menu. Enter their name and email and we send them a link to apply. Each member has a set number of referrals; the badge shows how many you have left. Your referrals show as Sent, Applied or Approved. Every application is still reviewed by staff.",
      es: "Use [Recomendar a un colega](/refer) en el menú. Escriba su nombre y correo y le enviamos un enlace para solicitar. Cada miembro tiene un número fijo de recomendaciones; el distintivo muestra cuántas le quedan. Aparecen como Enviada, Solicitó o Aprobada. El personal revisa cada solicitud.",
      de: "Nutzen Sie [Kollegen empfehlen](/refer) im Menü. Geben Sie Name und E-Mail ein, und wir senden einen Link zur Bewerbung. Jedes Mitglied hat eine feste Anzahl an Empfehlungen; das Abzeichen zeigt, wie viele übrig sind. Status: Gesendet, Beworben oder Zugelassen. Jede Bewerbung prüft weiterhin das Team.",
      ja: "メニューの[同僚を紹介する](/refer)を使います。名前とメールを入力すると、申し込み用のリンクをお送りします。紹介できる数は会員ごとに決まっており、バッジで残り数がわかります。状況は送信済み・申請済み・承認済みで表示されます。申請はすべてスタッフが審査します。",
    },
    keys: ["refer", "referral", "colleague", "recommend", "friend", "recomendar", "colega", "empfehlen", "kollege", "紹介", "同僚"],
  },
  {
    id: "viewers",
    audience: "member",
    title: { en: "Who viewed your profile", es: "Quién vio su perfil", de: "Wer Ihr Profil angesehen hat", ja: "プロフィールを見た人" },
    body: {
      en: "The right column of the [Ledger](/feed) shows developers who viewed your profile this week, with a 7-day chart. [See all viewers](/viewers) lists the last 30 days. Only approved members are shown. People you may want to work with suggests approved members who share a project with you.",
      es: "La columna derecha del [Ledger](/feed) muestra los desarrolladores que vieron su perfil esta semana, con un gráfico de 7 días. [Ver todas las visitas](/viewers) muestra los últimos 30 días. Solo se muestran miembros aprobados. Personas con quienes podría trabajar sugiere miembros que comparten un proyecto con usted.",
      de: "Die rechte Spalte im [Ledger](/feed) zeigt Entwickler, die Ihr Profil diese Woche angesehen haben, mit 7-Tage-Diagramm. [Alle Besucher ansehen](/viewers) zeigt die letzten 30 Tage. Nur zugelassene Mitglieder. Personen, mit denen Sie arbeiten könnten, schlägt Mitglieder aus gemeinsamen Projekten vor.",
      ja: "[Ledger](/feed) の右側に、今週プロフィールを見たデベロッパーが7日間のグラフとともに表示されます。[閲覧者をすべて表示](/viewers)で過去30日分を確認できます。承認済みメンバーのみ表示されます。「一緒に仕事をしたい人」は共通のプロジェクトのメンバーを提案します。",
    },
    keys: ["viewed", "views", "who saw", "visitor", "people you may", "visto", "visitas", "angesehen", "besucher", "閲覧", "見た人"],
  },
  {
    id: "ledger-developer",
    audience: "developer",
    title: { en: "Your projects and who you are seeking", es: "Sus proyectos y a quién busca", de: "Ihre Projekte und wen Sie suchen", ja: "プロジェクトと募集相手" },
    body: {
      en: "On the [Ledger](/feed), use Add a project, then choose who you're seeking (for example a general contractor, lender or architect). Submit it for staff approval. Once approved, members in those categories see it and can express interest; matching members are listed under each project so you can reach out.",
      es: "En el [Ledger](/feed), use Añadir un proyecto y elija a quién busca (por ejemplo contratista general, prestamista o arquitecto). Envíelo para aprobación del personal. Una vez aprobado, los miembros de esas categorías lo ven y pueden mostrar interés; los miembros afines aparecen bajo cada proyecto para que los contacte.",
      de: "Im [Ledger](/feed) tippen Sie auf Projekt hinzufügen und wählen, wen Sie suchen (z. B. Generalunternehmer, Kreditgeber oder Architekt). Reichen Sie es zur Freigabe durch das Team ein. Nach der Freigabe sehen Mitglieder dieser Kategorien das Projekt und können Interesse zeigen; passende Mitglieder stehen unter jedem Projekt.",
      ja: "[Ledger](/feed) で「プロジェクトを追加」し、募集相手（ゼネコン、レンダー、建築家など）を選びます。スタッフの承認に提出してください。承認後、該当カテゴリーのメンバーが閲覧・関心表明でき、各プロジェクトの下に該当メンバーが表示されるので連絡できます。",
    },
    keys: ["add a project", "my project", "seeking", "approval", "approved", "submit", "post project", "proyecto", "buscando", "projekt", "freigabe", "プロジェクト", "募集", "承認"],
  },
  {
    id: "getting-started-developer",
    audience: "developer",
    title: { en: "Getting started", es: "Primeros pasos", de: "Erste Schritte", ja: "はじめに" },
    body: {
      en: "Getting started runs in order: accept the [Member NDA](/member-nda), complete your [profile](/profile), add your first project, choose who you're seeking, submit and get approved by staff, then reach out to a member on your team from [Deals](/deals).",
      es: "Primeros pasos va en orden: acepte el [NDA de miembros](/member-nda), complete su [perfil](/profile), añada su primer proyecto, elija a quién busca, envíelo y obtenga la aprobación del personal, y contacte a un miembro de su equipo desde [Acuerdos](/deals).",
      de: "Erste Schritte der Reihe nach: [Mitglieder-NDA](/member-nda) akzeptieren, [Profil](/profile) vervollständigen, erstes Projekt hinzufügen, auswählen, wen Sie suchen, einreichen und freigeben lassen, dann über [Deals](/deals) ein Mitglied Ihres Teams kontaktieren.",
      ja: "はじめには順番に進みます：[会員NDA](/member-nda)に同意、[プロフィール](/profile)を完成、最初のプロジェクトを追加、募集相手を選択、提出してスタッフの承認を受け、[案件](/deals)からチームのメンバーに連絡します。",
    },
    keys: ["getting started", "checklist", "steps", "next step", "what next", "nda", "primeros pasos", "siguiente", "erste schritte", "nächste", "はじめに", "次", "ステップ"],
  },
  {
    id: "messages",
    audience: "all",
    title: { en: "Messages and connections", es: "Mensajes y conexiones", de: "Nachrichten und Verbindungen", ja: "メッセージとつながり" },
    body: {
      en: "You can message members you share a project with in [Messages](/messages). Connect adds someone to My Circle; they get a request to accept. Unread messages appear on your Ledger with a Reply link.",
      es: "Puede escribir a los miembros con quienes comparte un proyecto en [Mensajes](/messages). Conectar añade a alguien a Mi círculo; recibe una solicitud para aceptar. Los mensajes no leídos aparecen en su Ledger con un enlace Responder.",
      de: "Mitgliedern aus gemeinsamen Projekten schreiben Sie unter [Nachrichten](/messages). Verbinden fügt jemanden zu Mein Kreis hinzu; er erhält eine Anfrage. Ungelesene Nachrichten erscheinen im Ledger mit Antworten-Link.",
      ja: "共通のプロジェクトのメンバーには[メッセージ](/messages)で連絡できます。「つながる」でマイサークルに追加リクエストが送られます。未読メッセージは Ledger に返信リンク付きで表示されます。",
    },
    keys: ["message", "connect", "circle", "reply", "chat", "mensaje", "conectar", "círculo", "nachricht", "verbinden", "kreis", "メッセージ", "つながる", "サークル"],
  },
  {
    id: "deal-rooms",
    audience: "all",
    title: { en: "Deal rooms", es: "Salas de acuerdos", de: "Deal-Räume", ja: "ディールルーム" },
    body: {
      en: "A deal room holds a project's documents and checklist (site and title, permits, financing, insurance, contracts). Developers approve who gets access; approved members find it in [Deals](/deals). Upcoming milestones from your deal rooms show on your Ledger.",
      es: "Una sala de acuerdos guarda los documentos y la lista de un proyecto (terreno y título, permisos, financiación, seguros, contratos). El desarrollador aprueba el acceso; los miembros aprobados la encuentran en [Acuerdos](/deals). Los próximos hitos aparecen en su Ledger.",
      de: "Ein Deal-Raum enthält Dokumente und Checkliste eines Projekts (Grundstück, Genehmigungen, Finanzierung, Versicherung, Verträge). Der Entwickler gibt den Zugang frei; zugelassene Mitglieder finden ihn unter [Deals](/deals). Anstehende Meilensteine erscheinen im Ledger.",
      ja: "ディールルームにはプロジェクトの書類とチェックリスト（用地・権原、許認可、資金、保険、契約）があります。アクセスはデベロッパーが承認し、承認されたメンバーは[案件](/deals)から開けます。今後のマイルストーンは Ledger に表示されます。",
    },
    keys: ["deal room", "documents", "checklist", "milestone", "access", "sala", "documentos", "hito", "deal-raum", "dokumente", "meilenstein", "ディール", "書類", "マイルストーン"],
  },
];

export function topicsFor(isDeveloper: boolean): MemberTopic[] {
  return MEMBER_TOPICS.filter((t) => t.audience === "all" || t.audience === (isDeveloper ? "developer" : "member"));
}

export function topicText(topic: MemberTopic, locale: Locale, vars: Record<string, string> = {}): { title: string; body: string } {
  const fill = (s: string) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? k);
  return { title: fill(topic.title[locale] ?? topic.title.en), body: fill(topic.body[locale] ?? topic.body.en) };
}

/** Multilingual keyword match (substring, so it works for Japanese too). */
export function matchTopics(question: string, topics: MemberTopic[]): { topic: MemberTopic; score: number }[] {
  const q = question.toLowerCase();
  return topics
    .map((topic) => {
      let score = 0;
      for (const key of topic.keys) if (q.includes(key)) score += key.length >= 6 ? 3 : 2;
      for (const t of Object.values(topic.title)) if (q.includes(t.toLowerCase())) score += 4;
      return { topic, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

export const LANGUAGE_NAME: Record<Locale, string> = { en: "English", es: "Spanish", de: "German", ja: "Japanese" } as Record<Locale, string>;
