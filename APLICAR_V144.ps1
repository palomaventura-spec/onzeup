$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

function WriteUtf8NoBom($path, $content) {
  [IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))
}

function RequireFile($path) {
  if (!(Test-Path $path)) { throw "Arquivo nao encontrado: $path" }
}

Write-Host "ONZEUP v1.4.4 - Mercado Pago + titulos de videos" -ForegroundColor Cyan

# 1) Copiar arquivos novos/substituidos
$copies = @(
  @("src\lib\mercadopago.ts", "src\lib\mercadopago.ts"),
  @("src\app\checkout\actions.ts", "src\app\checkout\actions.ts"),
  @("src\app\api\mercadopago\webhook\route.ts", "src\app\api\mercadopago\webhook\route.ts"),
  @("src\app\checkout\mercadopago\retorno\page.tsx", "src\app\checkout\mercadopago\retorno\page.tsx"),
  @("src\components\PlayerVideoEditor.tsx", "src\components\PlayerVideoEditor.tsx")
)

foreach ($pair in $copies) {
  $src = Join-Path $root $pair[0]
  $dst = Join-Path (Get-Location) $pair[1]
  New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
  Copy-Item $src $dst -Force
}

# 2) Responsavel page
$p = Join-Path (Get-Location) "src\app\responsavel\page.tsx"
RequireFile $p
$c = Get-Content $p -Raw -Encoding UTF8

$c = $c.Replace(
'import { createPlayerPremiumPix } from "@/app/checkout/actions";',
'import { createPlayerPremiumMercadoPago } from "@/app/checkout/actions";' + [Environment]::NewLine + 'import PlayerVideoEditor from "@/components/PlayerVideoEditor";'
)

$c = $c.Replace(
'Pagamento via PIX.',
'Pagamento recorrente seguro pelo Mercado Pago.'
)

$c = $c.Replace(
'<form action={createPlayerPremiumPix}>',
'<form action={createPlayerPremiumMercadoPago}>'
)

$c = $c.Replace(
'<button className="btn">Assinar Premium via PIX</button>',
'<button className="btn">Assinar Premium • Mercado Pago</button>'
)

$oldVideos = @'
<div className="two-field-row">
                <label>Vídeos — um link por linha
                  <small className="field-help">{selected?.plan === "PREMIUM" ? "Premium: vários vídeos." : "Free: o primeiro link será utilizado."}</small>
                  <textarea name="videos" rows={6} defaultValue={selected?.videos || ""} placeholder={"https://youtube.com/watch?v=...\nhttps://youtu.be/..."} />
                </label>
                <label>Galeria — uma URL de imagem por linha
                  <textarea name="gallery" rows={6} defaultValue={selected?.gallery || ""} placeholder="https://..." />
                </label>
              </div>
'@

$newVideos = @'
<PlayerVideoEditor
                name="videos"
                defaultValue={selected?.videos || ""}
                premium={selected?.plan === "PREMIUM"}
              />

              <label>Galeria — uma URL de imagem por linha
                <textarea name="gallery" rows={6} defaultValue={selected?.gallery || ""} placeholder="https://..." />
              </label>
'@

if ($c.Contains($oldVideos)) {
  $c = $c.Replace($oldVideos, $newVideos)
} else {
  Write-Warning "Bloco antigo de videos nao encontrado automaticamente. O restante sera aplicado."
}

# Mensagem de retorno de pagamento
$needle = 'const linkStatusMessage ='
if ($c.Contains($needle) -and !$c.Contains('paymentStatusMessage')) {
  $insert = @'
  const paymentStatusMessage =
    query.paymentStatus === "erro"
      ? {
          type: "error",
          title: "Não foi possível iniciar o Mercado Pago.",
          text: "Tente novamente em alguns instantes. Nenhuma cobrança foi confirmada.",
        }
      : null;

'@
  $c = $c.Replace('  const linkStatusMessage =', $insert + '  const linkStatusMessage =')
  $c = $c.Replace(
'searchParams: Promise<{ player?: string; new?: string; linkStatus?: string; count?: string }>;',
'searchParams: Promise<{ player?: string; new?: string; linkStatus?: string; count?: string; paymentStatus?: string }>;'
  )
  $c = $c.Replace(
'            {linkStatusMessage ? (',
'            {paymentStatusMessage ? (' + [Environment]::NewLine +
'              <div className={`player-link-status-notice ${paymentStatusMessage.type}`}>' + [Environment]::NewLine +
'                <strong>{paymentStatusMessage.title}</strong>' + [Environment]::NewLine +
'                <p>{paymentStatusMessage.text}</p>' + [Environment]::NewLine +
'              </div>' + [Environment]::NewLine +
'            ) : null}' + [Environment]::NewLine + [Environment]::NewLine +
'            {linkStatusMessage ? ('
  )
}

WriteUtf8NoBom $p $c

# 3) Responsavel actions: preservar JSON estruturado de videos
$p = Join-Path (Get-Location) "src\app\responsavel\actions.ts"
RequireFile $p
$c = Get-Content $p -Raw -Encoding UTF8

if (!$c.Contains('function normalizeVideosForStorage')) {
$helper = @'

function normalizeVideosForStorage(raw: string, plan: string) {
  const value = raw.trim();
  if (!value) return null;

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      const cleanItems = parsed
        .map((item: any, index: number) => ({
          title: String(item?.title || "").trim(),
          description: String(item?.description || "").trim(),
          url: String(item?.url || "").trim(),
          featured: Boolean(item?.featured ?? index === 0),
        }))
        .filter((item: any) => item.url);

      const limited = plan === "PREMIUM" ? cleanItems : cleanItems.slice(0, 1);
      if (limited.length && !limited.some((item: any) => item.featured)) {
        limited[0].featured = true;
      }
      return limited.length ? JSON.stringify(limited) : null;
    }
  } catch {}

  const urls = value.split(/\r?\n/).map((v) => v.trim()).filter(Boolean);
  return (plan === "PREMIUM" ? urls : urls.slice(0, 1)).join("\n") || null;
}
'@
  $marker = 'async function guardianForUser'
  $c = $c.Replace($marker, $helper + [Environment]::NewLine + $marker)
}

$old = @'
    videos: (() => {
      const all = clean(formData.get("videos")).split(/\r?\n/).map(v => v.trim()).filter(Boolean);
      const plan = clean(formData.get("plan")) || "FREE";
      return (plan === "PREMIUM" ? all : all.slice(0, 1)).join("\n") || null;
    })(),
'@
$new = @'
    videos: normalizeVideosForStorage(
      clean(formData.get("videos")),
      clean(formData.get("plan")) || "FREE",
    ),
'@
if ($c.Contains($old)) {
  $c = $c.Replace($old, $new)
} else {
  Write-Warning "Normalizador antigo de videos nao encontrado."
}
WriteUtf8NoBom $p $c

# 4) Página publica premium no slug raiz
$p = Join-Path (Get-Location) "src\app\[slug]\page.tsx"
RequireFile $p
$c = Get-Content -LiteralPath $p -Raw -Encoding UTF8

if (!$c.Contains('function videoItems(')) {
$videoHelper = @'

type PublicVideo = {
  title: string;
  description: string;
  url: string;
  featured: boolean;
};

function videoItems(value?: string | null): PublicVideo[] {
  const raw = String(value || "").trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item, index) => ({
          title: String(item?.title || "").trim(),
          description: String(item?.description || "").trim(),
          url: String(item?.url || "").trim(),
          featured: Boolean(item?.featured ?? index === 0),
        }))
        .filter((item) => item.url)
        .sort((a, b) => Number(b.featured) - Number(a.featured));
    }
  } catch {}

  return lines(raw).map((url, index) => ({
    title: index === 0 ? "Melhores momentos" : `Vídeo ${index + 1}`,
    description: "",
    url,
    featured: index === 0,
  }));
}
'@
  $c = $c.Replace('function youtubeId(url:string) {', $videoHelper + [Environment]::NewLine + 'function youtubeId(url:string) {')
}

$c = $c.Replace('const videos=lines(player.videos);', 'const videos=videoItems(player.videos);')
$c = $c.Replace('const video=videos[0] ? youtubeEmbed(videos[0]) : "";', 'const video=videos[0] ? youtubeEmbed(videos[0].url) : "";')

$oldMap = @'
          {videos.map((v,i)=>{const emb=youtubeEmbed(v);return emb?<article className={i===0?"featured":""} key={i}>
            <div className="premium-youtube-frame">
              <iframe src={emb} title={`${player.name} vídeo ${i+1}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen/>
            </div>
            <div className="premium-media-caption">
              <span>{i===0?"DESTAQUE":`VÍDEO ${String(i+1).padStart(2,"0")}`}</span>
              <strong>{i===0?"Melhores momentos":`Vídeo ${i+1}`}</strong>
            </div>
          </article>:null})}
'@

$newMap = @'
          {videos.map((v,i)=>{const emb=youtubeEmbed(v.url);return emb?<article className={v.featured?"featured":""} key={`${v.url}-${i}`}>
            <div className="premium-youtube-frame">
              <iframe src={emb} title={v.title || `${player.name} vídeo ${i+1}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen/>
            </div>
            <div className="premium-media-caption">
              <span>{v.featured?"DESTAQUE":`VÍDEO ${String(i+1).padStart(2,"0")}`}</span>
              <strong>{v.title || (v.featured ? "Melhores momentos" : `Vídeo ${i+1}`)}</strong>
              {v.description?<small>{v.description}</small>:null}
            </div>
          </article>:null})}
'@

if ($c.Contains($oldMap)) {
  $c = $c.Replace($oldMap, $newMap)
} else {
  Write-Warning "Renderizador premium de videos nao encontrado automaticamente."
}

WriteUtf8NoBom $p $c

# 5) CSS: anexar somente uma vez
$cssPath = Join-Path (Get-Location) "src\app\globals.css"
RequireFile $cssPath
$css = Get-Content $cssPath -Raw -Encoding UTF8
if (!$css.Contains("ONZEUP v1.4.4 — PlayerVideoEditor")) {
  $extra = Get-Content (Join-Path $root "V144_STYLES.css") -Raw -Encoding UTF8
  $css = $css.TrimEnd() + [Environment]::NewLine + [Environment]::NewLine + $extra
  WriteUtf8NoBom $cssPath $css
}

Write-Host ""
Write-Host "v1.4.4 aplicada. NAO ha alteracao de banco." -ForegroundColor Green
Write-Host ""
Write-Host "Confirme as variaveis Vercel:"
Write-Host "  MERCADOPAGO_PUBLIC_KEY"
Write-Host "  MERCADOPAGO_ACCESS_TOKEN"
Write-Host "  MERCADOPAGO_WEBHOOK_SECRET"
Write-Host ""
Write-Host "Agora rode:"
Write-Host "  npx prisma validate"
Write-Host "  npm run build"
