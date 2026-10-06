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

function chunks<T>(
  values: T[],
  size: number,
) {
  const result: T[][] = [];

  for (
    let index = 0;
    index < values.length;
    index += size
  ) {
    result.push(
      values.slice(index, index + size),
    );
  }

  return result;
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
    const rowsPerPage = 4;
    const rowGroups = chunks(
      rows,
      rowsPerPage,
    );

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

    const selectionLabel =
      validCustomSelection.length
        ? validCustomSelection.join(", ")
        : categoryParam &&
            categoryParam !== "__all__" &&
            categoryParam !== "__custom__"
          ? categoryParam
          : "Todas as categorias";

    rowGroups.forEach(
      (pageRows, pageIndex) => {
        const page = pdf.addPage(pageSize);

        const width = page.getWidth();
        const height = page.getHeight();

        page.drawText(clubName, {
          x: margin,
          y: height - 44,
          size: 20,
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
        const tableTop = height - 135;

        const categoryWidth = 105;

        const dayWidth =
          (width -
            margin * 2 -
            categoryWidth) /
          7;

        const headerHeight = 42;
        const rowHeight = 88;

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

        pageRows.forEach(
          (row, rowIndex) => {
            const rowTop =
              tableTop -
              headerHeight -
              rowHeight * rowIndex;

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

            page.drawText(
              fitText(
                row.category ||
                  "Categoria",
                categoryWidth - 18,
                bold,
                12,
              ),
              {
                x: tableX + 8,
                y: rowTop - 31,
                size: 12,
                font: bold,
                color: black,
              },
            );

            if (row.birthYear) {
              page.drawText(
                `Ano-base: ${row.birthYear}`,
                {
                  x: tableX + 8,
                  y: rowTop - 50,
                  size: 9.5,
                  font: bold,
                  color: muted,
                },
              );
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

                const gap = 4;

                const cardHeight =
                  (rowHeight -
                    8 -
                    gap *
                      Math.max(
                        0,
                        events.length - 1,
                      )) /
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
                      cellY +
                      rowHeight -
                      4 -
                      cardHeight -
                      eventIndex *
                        (cardHeight + gap);

                    page.drawRectangle({
                      x: cellX + 4,
                      y: cardY,
                      width: dayWidth - 8,
                      height: cardHeight,
                      color: fill,
                    });

                    const title =
                      event.title ||
                      typeLabel(event.type);

                    const titleSize = 11;
                    const detailSize = 9;

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

                    const maxDetails =
                      cardHeight < 35
                        ? 1
                        : cardHeight < 48
                          ? 2
                          : 3;

                    const visibleDetails =
                      details.slice(
                        0,
                        maxDetails,
                      );

                    const lineHeight = 11;

                    const totalHeight =
                      lineHeight *
                      (1 +
                        visibleDetails.length);

                    let textY =
                      cardY +
                      cardHeight / 2 +
                      totalHeight / 2 -
                      10;

                    page.drawText(
                      fitText(
                        title,
                        dayWidth - 18,
                        bold,
                        titleSize,
                      ),
                      {
                        x: cellX + 9,
                        y: textY,
                        size: titleSize,
                        font: bold,
                        color: eventTextColor,
                      },
                    );

                    textY -= lineHeight;

                    visibleDetails.forEach(
                      (detail) => {
                        page.drawText(
                          fitText(
                            detail,
                            dayWidth - 18,
                            regular,
                            detailSize,
                          ),
                          {
                            x: cellX + 9,
                            y: textY,
                            size: detailSize,
                            font: regular,
                            color: eventTextColor,
                          },
                        );

                        textY -= lineHeight;
                      },
                    );
                  },
                );
              },
            );
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
