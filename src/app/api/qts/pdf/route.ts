import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "pdf-lib";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { hasClubPermission } from "@/lib/club-permissions";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAYS = [
  ["mon", "SEG"],
  ["tue", "TER"],
  ["wed", "QUA"],
  ["thu", "QUI"],
  ["fri", "SEX"],
  ["sat", "SÁB"],
  ["sun", "DOM"],
] as const;

type DayKey =
  | "mon"
  | "tue"
  | "wed"
  | "thu"
  | "fri"
  | "sat"
  | "sun";

type QtrEvent = {
  type?: string;
  title?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  notes?: string;
  sourceType?: "TRAINING" | "MATCH";
  sourceId?: string;
  hidden?: boolean;
};

type QtrRow = {
  category?: string;
  birthYear?: number | null;
  mon?: QtrEvent[];
  tue?: QtrEvent[];
  wed?: QtrEvent[];
  thu?: QtrEvent[];
  fri?: QtrEvent[];
  sat?: QtrEvent[];
  sun?: QtrEvent[];
};

function mondayOf(date: Date) {
  const result = new Date(date);
  const day = result.getDay();

  result.setDate(
    result.getDate() +
      (day === 0 ? -6 : 1 - day),
  );

  result.setHours(12, 0, 0, 0);

  return result;
}

function readRows(raw?: string | null): QtrRow[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function shortDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function longDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function typeLabel(type?: string) {
  if (type === "TRAINING") return "Treino";
  if (type === "MATCH") return "Jogo";
  if (type === "FRIENDLY") return "Amistoso";
  if (type === "EVENT") return "Evento";
  return "Outro";
}

function readablePdfTextColor(value: string) {
  const clean = value.replace("#", "").padEnd(6, "0").slice(0, 6);
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance =
    (r * 299 + g * 587 + b * 114) / 1000;

  return luminance > 160
    ? rgb(16 / 255, 24 / 255, 32 / 255)
    : rgb(1, 1, 1);
}

function hexColor(value: string) {
  const clean = value
    .replace("#", "")
    .padEnd(6, "0")
    .slice(0, 6);

  const r =
    parseInt(clean.slice(0, 2), 16) / 255;

  const g =
    parseInt(clean.slice(2, 4), 16) / 255;

  const b =
    parseInt(clean.slice(4, 6), 16) / 255;

  return rgb(
    Number.isFinite(r) ? r : 0.8,
    Number.isFinite(g) ? g : 0.8,
    Number.isFinite(b) ? b : 0.8,
  );
}

function fitText(
  text: string,
  maxWidth: number,
  font: {
    widthOfTextAtSize(
      text: string,
      size: number,
    ): number;
  },
  size: number,
) {
  if (
    font.widthOfTextAtSize(text, size) <=
    maxWidth
  ) {
    return text;
  }

  let result = text;

  while (
    result.length > 1 &&
    font.widthOfTextAtSize(
      `${result}…`,
      size,
    ) > maxWidth
  ) {
    result = result.slice(0, -1);
  }

  return `${result}…`;
}

/**
 * Distribui os nomes das categorias por linhas, evitando cortes com reticências.
 * Apenas apresentação: não modifica categorias nem os eventos do QTS.
 */
function wrapCategoryText(
  text: string,
  maxWidth: number,
  font: { widthOfTextAtSize(text: string, size: number): number },
  size: number,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      current = "";
    }

    // Também suporta palavras isoladas mais largas que a coluna.
    let segment = "";
    for (const letter of word) {
      if (
        segment &&
        font.widthOfTextAtSize(segment + letter, size) > maxWidth
      ) {
        lines.push(segment);
        segment = letter;
      } else {
        segment += letter;
      }
    }
    current = segment;
  }

  if (current) lines.push(current);
  return lines;
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    if (
      !user?.organizationId ||
      !hasClubPermission(user, "QTR_VIEW")
    ) {
      return NextResponse.json(
        { error: "Acesso não autorizado." },
        { status: 403 },
      );
    }

    const url = new URL(request.url);

    const weekParam =
      url.searchParams.get("week");

    const categoryParam =
      url.searchParams
        .get("category")
        ?.trim();

    const selectedCategories =
      String(
        url.searchParams.get("categories") ||
          "",
      )
        .split("|")
        .map((value) => value.trim())
        .filter(Boolean);

    const requested =
      weekParam &&
      /^\d{4}-\d{2}-\d{2}$/.test(weekParam)
        ? new Date(`${weekParam}T12:00:00`)
        : new Date();

    const weekStart = mondayOf(requested);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const [
      qtr,
      settings,
      organization,
      categoryColors,
    ] = await Promise.all([
      prisma.qtr.findUnique({
        where: {
          organizationId_weekStart: {
            organizationId:
              user.organizationId,
            weekStart,
          },
        },
      }),

      prisma.qtrSettings.findUnique({
        where: {
          organizationId:
            user.organizationId,
        },
      }),

      prisma.organization.findUnique({
        where: {
          id: user.organizationId,
        },
        select: {
          name: true,
          publicName: true,
        },
      }),

      prisma.category.findMany({
        where: {
          organizationId:
            user.organizationId,
        },
        select: {
          name: true,
          accentColor: true,
        },
      }),
    ]);

    if (!qtr) {
      return NextResponse.json(
        { error: "QTS não encontrado." },
        { status: 404 },
      );
    }

    const allRows = readRows(qtr.dataJson);

    const validCustomSelection =
      selectedCategories.filter((name) =>
        allRows.some(
          (row) => row.category === name,
        ),
      );

    const rows =
      validCustomSelection.length
        ? allRows.filter((row) =>
            validCustomSelection.includes(
              row.category || "",
            ),
          )
        : categoryParam &&
            categoryParam !== "__all__" &&
            categoryParam !== "__custom__"
          ? allRows.filter(
              (row) =>
                row.category === categoryParam,
            )
          : allRows;

    if (!rows.length) {
      return NextResponse.json(
        {
          error:
            "Nenhuma categoria selecionada possui dados no QTS.",
        },
        { status: 404 },
      );
    }

    const categoryColorByName = new Map(
      categoryColors.map((item) => [
        item.name,
        item.accentColor,
      ]),
    );

    const eventColors: Record<
      string,
      string
    > = {
      TRAINING:
        settings?.trainingColor ??
        "#2B9D47",
      MATCH:
        settings?.matchColor ??
        "#D4AA18",
      FRIENDLY:
        settings?.friendlyColor ??
        "#3377A5",
      EVENT:
        settings?.eventColor ??
        "#76539A",
      OTHER:
        settings?.otherColor ??
        "#29333D",
    };

    const pdf = await PDFDocument.create();

    const regular =
      await pdf.embedFont(
        StandardFonts.Helvetica,
      );

    const bold =
      await pdf.embedFont(
        StandardFonts.HelveticaBold,
      );

    const pageSize: [number, number] = [
      841.89,
      595.28,
    ];

    const margin = 28;
    // Layout A4 paisagem: normalmente ate 8 categorias por pagina.
    // Se houver varias atividades na mesma celula, usamos linhas mais
    // altas e uma nova pagina, evitando sobreposicao de informacoes.
    const maxRowsPerPage = 8;
    const tableTopY = pageSize[1] - 124;
    const headerHeight = 30;
    const tableBottomY = 47; // 15pt acima da linha do rodape
    const availableRowsHeight =
      tableTopY - headerHeight - tableBottomY;
    const categoryWidth = 140;

    function categoryNameLayout(row: QtrRow) {
      const maxLines = row.birthYear ? 3 : 4;
      let fontSize = 10;
      let lines = wrapCategoryText(
        row.category || "Categoria",
        categoryWidth - 16,
        bold,
        fontSize,
      );

      while (lines.length > maxLines && fontSize > 7) {
        fontSize -= 0.5;
        lines = wrapCategoryText(
          row.category || "Categoria",
          categoryWidth - 16,
          bold,
          fontSize,
        );
      }
      return { lines, fontSize };
    }

    function requiredRowHeight(row: QtrRow) {
      const { lines, fontSize } = categoryNameLayout(row);
      const nameHeight =
        12 + lines.length * (fontSize + 1.5) + (row.birthYear ? 13 : 0);
      const maxEventsPerDay = DAYS.reduce((max, [key]) => {
        const events = row[key as DayKey];
        return Math.max(
          max,
          Array.isArray(events)
            ? events.filter((event) => event.hidden !== true).length
            : 0,
        );
      }, 0);
      const eventHeight =
        maxEventsPerDay <= 1
          ? 48
          : 6 + maxEventsPerDay * 32 + (maxEventsPerDay - 1) * 3;
      return Math.max(48, Math.ceil(nameHeight), eventHeight);
    }

    type PdfRowGroup = { pageRows: QtrRow[]; rowHeights: number[] };
    const rowGroups: PdfRowGroup[] = [];
    let pendingRows: QtrRow[] = [];
    let pendingHeights: number[] = [];
    let pendingTotal = 0;

    function finishPage() {
      if (!pendingRows.length) return;
      const free = Math.max(0, availableRowsHeight - pendingTotal);
      const extraPerRow = free / pendingRows.length;
      // Nao aumentar indefinidamente as linhas quando ha poucas categorias.
      const rowHeights = pendingHeights.map((minimum) =>
        minimum + Math.max(0, Math.min(extraPerRow, 64 - minimum)),
      );
      rowGroups.push({ pageRows: pendingRows, rowHeights });
      pendingRows = [];
      pendingHeights = [];
      pendingTotal = 0;
    }

    for (const row of rows) {
      const needed = requiredRowHeight(row);
      if (
        pendingRows.length &&
        (pendingRows.length >= maxRowsPerPage ||
          pendingTotal + needed > availableRowsHeight)
      ) {
        finishPage();
      }
      pendingRows.push(row);
      pendingHeights.push(needed);
      pendingTotal += needed;
    }
    finishPage();

    const black = rgb(
      16 / 255,
      24 / 255,
      32 / 255,
    );

    const muted = rgb(
      95 / 255,
      109 / 255,
      117 / 255,
    );

    const line = rgb(
      220 / 255,
      228 / 255,
      232 / 255,
    );

    const clubName =
      organization?.publicName ||
      organization?.name ||
      "11UP Club";

    // Não repetir uma lista longa de nomes no subtítulo do relatório.
    // As categorias selecionadas já aparecem completas na tabela.
    const selectionLabel =
      validCustomSelection.length > 1
        ? `${validCustomSelection.length} categorias selecionadas`
        : validCustomSelection.length === 1
          ? validCustomSelection[0]
          : categoryParam &&
              categoryParam !== "__all__" &&
              categoryParam !== "__custom__"
            ? categoryParam
            : `Todas as categorias (${rows.length})`;

    rowGroups.forEach(
      ({ pageRows, rowHeights }, pageIndex) => {
        const page = pdf.addPage(pageSize);

        const width = page.getWidth();
        const height = page.getHeight();

        page.drawText(fitText(clubName, 500, bold, 18), {
          x: margin,
          y: height - 44,
          size: 18,
          font: bold,
          color: black,
        });

        page.drawText("QTS semanal", {
          x: margin,
          y: height - 69,
          size: 24,
          font: bold,
          color: black,
        });

        page.drawText(
          fitText(
            selectionLabel,
            480,
            bold,
            12,
          ),
          {
            x: margin,
            y: height - 91,
            size: 12,
            font: bold,
            color: muted,
          },
        );

        const weekLabel =
          `Semana: ${longDate(weekStart)} a ` +
          longDate(weekEnd);

        const weekWidth =
          regular.widthOfTextAtSize(
            weekLabel,
            10,
          );

        page.drawText(weekLabel, {
          x:
            width -
            margin -
            weekWidth,
          y: height - 46,
          size: 10,
          font: regular,
          color: muted,
        });

        page.drawLine({
          start: {
            x: margin,
            y: height - 108,
          },
          end: {
            x: width - margin,
            y: height - 108,
          },
          thickness: 1.2,
          color: black,
        });

        const tableX = margin;
        const tableTop = tableTopY;

        const dayWidth =
          (width -
            margin * 2 -
            categoryWidth) /
          7;


        page.drawText("CATEGORIA", {
          x: tableX + 5,
          y: tableTop - 16,
          size: 9,
          font: bold,
          color: black,
        });

        DAYS.forEach(
          ([, label], index) => {
            const date = new Date(weekStart);
            date.setDate(
              date.getDate() + index,
            );

            const cellX =
              tableX +
              categoryWidth +
              dayWidth * index;

            const labelWidth =
              bold.widthOfTextAtSize(
                label,
                9,
              );

            const dateLabel =
              shortDate(date);

            const dateWidth =
              bold.widthOfTextAtSize(
                dateLabel,
                8,
              );

            page.drawText(label, {
              x:
                cellX +
                dayWidth / 2 -
                labelWidth / 2,
              y: tableTop - 13,
              size: 9,
              font: bold,
              color: black,
            });

            page.drawText(dateLabel, {
              x:
                cellX +
                dayWidth / 2 -
                dateWidth / 2,
              y: tableTop - 27,
              size: 8,
              font: bold,
              color: black,
            });
          },
        );

        let rowTop = tableTop - headerHeight;
        pageRows.forEach(
          (row, rowIndex) => {
            const rowHeight = rowHeights[rowIndex];

            const categoryColor =
              categoryColorByName.get(
                row.category || "",
              ) ?? "#20B6D2";

            page.drawRectangle({
              x: tableX,
              y: rowTop - rowHeight,
              width: categoryWidth - 4,
              height: rowHeight - 4,
              borderWidth: 1.5,
              borderColor:
                hexColor(String(categoryColor)),
              color: rgb(
                247 / 255,
                249 / 255,
                250 / 255,
              ),
            });

            // Nome completo em linhas, sem sobrepor o ano-base.
            const { lines: categoryLines, fontSize: categoryFontSize } =
              categoryNameLayout(row);
            const categoryLineHeight = categoryFontSize + 1.5;
            categoryLines.forEach((part, partIndex) => {
              page.drawText(part, {
                x: tableX + 8,
                y: rowTop - 14 - partIndex * categoryLineHeight,
                size: categoryFontSize,
                font: bold,
                color: black,
              });
            });

            if (row.birthYear) {
              page.drawText(`Ano-base: ${row.birthYear}`, {
                x: tableX + 8,
                y: rowTop - rowHeight + 9,
                size: 7.5,
                font: bold,
                color: muted,
              });
            }

            DAYS.forEach(
              ([key], dayIndex) => {
                const cellX =
                  tableX +
                  categoryWidth +
                  dayWidth * dayIndex;

                const cellY =
                  rowTop - rowHeight;

                page.drawRectangle({
                  x: cellX + 2,
                  y: cellY + 2,
                  width: dayWidth - 4,
                  height: rowHeight - 4,
                  borderWidth: 0.7,
                  borderColor: line,
                  color: rgb(
                    250 / 255,
                    251 / 255,
                    252 / 255,
                  ),
                });

                const events =
                  (
                    Array.isArray(
                      row[key as DayKey],
                    )
                      ? row[key as DayKey]!
                      : []
                  ).filter(
                    (event) =>
                      event.hidden !== true,
                  );

                if (!events.length) {
                  const dash = "—";
                  const dashWidth =
                    regular.widthOfTextAtSize(
                      dash,
                      15,
                    );

                  page.drawText(dash, {
                    x:
                      cellX +
                      dayWidth / 2 -
                      dashWidth / 2,
                    y:
                      cellY +
                      rowHeight / 2 -
                      4,
                    size: 15,
                    font: regular,
                    color: rgb(
                      163 / 255,
                      175 / 255,
                      182 / 255,
                    ),
                  });

                  return;
                }

                const gap = events.length > 1 ? 2 : 0;

                const cardHeight =
                  (rowHeight - 6 - gap * Math.max(0, events.length - 1)) /
                  events.length;

                events.forEach(
                  (
                    event,
                    eventIndex,
                  ) => {
                    const type =
                      event.type &&
                      eventColors[event.type]
                        ? event.type
                        : "OTHER";

                    const activityColor =
                      type === "TRAINING" &&
                      settings?.trainingUsesCategoryColor
                        ? categoryColor
                        : eventColors[type];

                    const activityHex = String(
                      activityColor || "#29333D",
                    );

                    const fill =
                      hexColor(activityHex);

                    const eventTextColor =
                      readablePdfTextColor(activityHex);

                    const cardY =
                      cellY + rowHeight - 3 - cardHeight -
                      eventIndex * (cardHeight + gap);

                    page.drawRectangle({
                      x: cellX + 3,
                      y: cardY,
                      width: dayWidth - 6,
                      height: cardHeight,
                      color: fill,
                    });

                    const title =
                      event.title ||
                      typeLabel(event.type);

                    const titleSize = cardHeight < 34 ? 8 : 9;
                    const detailSize = cardHeight < 34 ? 7 : 7.5;

                    const details: string[] =
                      [];

                    if (
                      event.startTime ||
                      event.endTime
                    ) {
                      details.push(
                        `${
                          event.startTime ||
                          ""
                        }${
                          event.endTime
                            ? ` - ${event.endTime}`
                            : ""
                        }`,
                      );
                    }

                    if (event.location) {
                      details.push(
                        event.location,
                      );
                    }

                    if (event.notes) {
                      details.push(
                        event.notes,
                      );
                    }

                    const lineHeight = cardHeight < 34 ? 8 : 9;
                    const maxDetails = Math.min(
                      details.length,
                      Math.max(0, Math.floor((cardHeight - 12) / lineHeight)),
                    );
                    const visibleDetails = details.slice(0, maxDetails);

                    // Titulos e horarios compactos, sem ultrapassar as celulas.
                    let textY = cardY + cardHeight - 10;
                    page.drawText(
                      fitText(title, dayWidth - 14, bold, titleSize),
                      {
                        x: cellX + 7,
                        y: textY,
                        size: titleSize,
                        font: bold,
                        color: eventTextColor,
                      },
                    );

                    visibleDetails.forEach((detail) => {
                      textY -= lineHeight;
                      page.drawText(
                        fitText(detail, dayWidth - 14, regular, detailSize),
                        {
                          x: cellX + 7,
                          y: textY,
                          size: detailSize,
                          font: regular,
                          color: eventTextColor,
                        },
                      );
                    });
                  },
                );
              },
            );
            rowTop -= rowHeight;
          },
        );

        page.drawLine({
          start: {
            x: margin,
            y: 32,
          },
          end: {
            x: width - margin,
            y: 32,
          },
          thickness: 0.6,
          color: line,
        });

        page.drawText(
          "Gerado por 11UP - Gestão de futebol e futsal de base",
          {
            x: margin,
            y: 18,
            size: 7.5,
            font: regular,
            color: muted,
          },
        );

        const footerRight =
          `QTS gerado em ${longDate(
            new Date(),
          )} · Página ${pageIndex + 1} de ${rowGroups.length}`;

        const footerRightWidth =
          regular.widthOfTextAtSize(
            footerRight,
            7.5,
          );

        page.drawText(footerRight, {
          x:
            width -
            margin -
            footerRightWidth,
          y: 18,
          size: 7.5,
          font: regular,
          color: muted,
        });
      },
    );

    const bytes = await pdf.save();

    const selectionFilePart =
      validCustomSelection.length
        ? "selecao"
        : categoryParam &&
            categoryParam !== "__all__" &&
            categoryParam !== "__custom__"
          ? categoryParam
          : "semanal";

    const fileName =
      `QTS-${selectionFilePart}-` +
      `${weekStart
        .toISOString()
        .slice(0, 10)}.pdf`
        .replace(
          /[^a-zA-Z0-9._-]/g,
          "-",
        );

    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type":
          "application/pdf",
        "Content-Disposition":
          `attachment; filename="${fileName}"`,
        "Cache-Control":
          "no-store",
      },
    });
  } catch (error) {
    console.error(
      "QTS_PDF_GENERATION_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível gerar o PDF do QTS.",
      },
      { status: 500 },
    );
  }
}
