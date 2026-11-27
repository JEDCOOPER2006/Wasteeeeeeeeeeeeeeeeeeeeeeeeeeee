
import React, { useMemo } from 'react';
import { Download } from 'lucide-react';
import ExcelJS from 'exceljs';
import { useWaste } from '../lib/store';

const EXCEL_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const addReportHeading = (
  worksheet: ExcelJS.Worksheet,
  title: string,
  subtitle: string,
  columnCount: number
) => {
  worksheet.mergeCells(1, 1, 1, columnCount);
  worksheet.mergeCells(2, 1, 2, columnCount);
  worksheet.mergeCells(3, 1, 3, columnCount);

  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = 'VILLANUEVA MUNICIPAL WASTE OPERATIONS';
  titleCell.font = {
    name: 'Arial',
    size: 16,
    bold: true,
    color: { argb: 'FFFFFFFF' },
  };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF166534' },
  };
  titleCell.alignment = {
    horizontal: 'center',
    vertical: 'middle',
  };

  const subtitleCell = worksheet.getCell(2, 1);
  subtitleCell.value = title;
  subtitleCell.font = {
    name: 'Arial',
    size: 13,
    bold: true,
    color: { argb: 'FF166534' },
  };
  subtitleCell.alignment = {
    horizontal: 'center',
    vertical: 'middle',
  };

  const generatedCell = worksheet.getCell(3, 1);
  generatedCell.value =
    `${subtitle} | Generated: ${new Date().toLocaleString('en-PH')}`;
  generatedCell.font = {
    name: 'Arial',
    size: 9,
    italic: true,
    color: { argb: 'FF666666' },
  };
  generatedCell.alignment = {
    horizontal: 'center',
    vertical: 'middle',
  };

  worksheet.getRow(1).height = 32;
  worksheet.getRow(2).height = 25;
  worksheet.getRow(3).height = 22;
  worksheet.getRow(4).height = 12;

  worksheet.properties.defaultRowHeight = 22;

  worksheet.pageSetup = {
    paperSize: 9,
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalDpi: 300,
    verticalDpi: 300,
  };

  worksheet.headerFooter.oddFooter =
    '&LVillanueva Municipal Waste Operations&RPage &P of &N';
};

const styleTableHeader = (row: ExcelJS.Row) => {
  row.height = 30;

  row.eachCell((cell) => {
    cell.font = {
      name: 'Arial',
      size: 10,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };

    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF166534' },
    };

    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };

    cell.border = {
      top: { style: 'thin', color: { argb: 'FF14532D' } },
      bottom: { style: 'medium', color: { argb: 'FF14532D' } },
      left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
      right: { style: 'thin', color: { argb: 'FFFFFFFF' } },
    };
  });
};

const styleBodyRow = (row: ExcelJS.Row, alternate: boolean) => {
  row.height = 25;

  row.eachCell((cell) => {
    cell.font = {
      name: 'Arial',
      size: 10,
      color: { argb: 'FF262626' },
    };

    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: {
        argb: alternate ? 'FFF0FDF4' : 'FFFFFFFF',
      },
    };

    cell.alignment = {
      vertical: 'middle',
      wrapText: true,
    };

    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    };
  });
};

const downloadWorkbook = async (
  workbook: ExcelJS.Workbook,
  filename: string
) => {
  const buffer = await workbook.xlsx.writeBuffer();

  // Convert the ExcelJS result into a Blob directly.
  const blob = new Blob([buffer as BlobPart], {
    type: EXCEL_MIME_TYPE,
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const showExportError = (error: unknown) => {
  console.error('Excel export failed:', error);
  window.alert(
    'Unable to generate the Excel report. Please try again.'
  );
};

export const ReportsPage: React.FC = () => {
  const { visibleSchedules } = useWaste();

  const byArea = useMemo(() => {
    const map = new Map<
      string,
      {
        area: string;
        total: number;
        completed: number;
        inProgress: number;
        scheduled: number;
        cancelled: number;
      }
    >();

    for (const s of visibleSchedules) {
      const key = s.area.trim() || 'Unspecified';

      const r = map.get(key) ?? {
        area: key,
        total: 0,
        completed: 0,
        inProgress: 0,
        scheduled: 0,
        cancelled: 0,
      };

      r.total++;

      if (s.status === 'Completed') r.completed++;
      else if (s.status === 'In Progress') r.inProgress++;
      else if (s.status === 'Cancelled') r.cancelled++;
      else r.scheduled++;

      map.set(key, r);
    }

    return [...map.values()]
      .map((r) => ({
        ...r,
        rate: r.total
          ? Math.round((r.completed / r.total) * 100)
          : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [visibleSchedules]);

  const exportAreas = async () => {
    try {
      const workbook = new ExcelJS.Workbook();

      workbook.creator = 'Villanueva Municipal Waste Operations';
      workbook.subject = 'Waste Collection Summary by Area';
      workbook.title = 'Collection Summary by Area';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Area Summary');

      addReportHeading(
        worksheet,
        'WASTE COLLECTION SUMMARY BY AREA',
        'Collection Performance Report',
        7
      );

      worksheet.columns = [
        { key: 'area', width: 30 },
        { key: 'total', width: 15 },
        { key: 'completed', width: 17 },
        { key: 'inProgress', width: 18 },
        { key: 'scheduled', width: 17 },
        { key: 'cancelled', width: 17 },
        { key: 'rate', width: 22 },
      ];

      const header = worksheet.getRow(5);
      header.values = [
        'Area',
        'Total Collections',
        'Completed',
        'In Progress',
        'Scheduled',
        'Cancelled',
        'Completion Rate',
      ];

      styleTableHeader(header);

      byArea.forEach((r, index) => {
        const row = worksheet.addRow([
          r.area,
          r.total,
          r.completed,
          r.inProgress,
          r.scheduled,
          r.cancelled,
          r.rate / 100,
        ]);

        styleBodyRow(row, index % 2 === 1);

        for (let col = 2; col <= 6; col++) {
          row.getCell(col).numFmt = '#,##0';
          row.getCell(col).alignment = {
            horizontal: 'center',
            vertical: 'middle',
          };
        }

        row.getCell(7).numFmt = '0%';
        row.getCell(7).alignment = {
          horizontal: 'center',
          vertical: 'middle',
        };

        row.getCell(3).font = {
          name: 'Arial',
          size: 10,
          bold: true,
          color: { argb: 'FF15803D' },
        };

        row.getCell(4).font = {
          name: 'Arial',
          size: 10,
          color: { argb: 'FF2563EB' },
        };

        row.getCell(6).font = {
          name: 'Arial',
          size: 10,
          color: { argb: 'FFBE123C' },
        };
      });

      const totalCollections = byArea.reduce(
        (sum, r) => sum + r.total,
        0
      );

      const completed = byArea.reduce(
        (sum, r) => sum + r.completed,
        0
      );

      const inProgress = byArea.reduce(
        (sum, r) => sum + r.inProgress,
        0
      );

      const scheduled = byArea.reduce(
        (sum, r) => sum + r.scheduled,
        0
      );

      const cancelled = byArea.reduce(
        (sum, r) => sum + r.cancelled,
        0
      );

      const grandTotal = worksheet.addRow([
        'GRAND TOTAL',
        totalCollections,
        completed,
        inProgress,
        scheduled,
        cancelled,
        totalCollections ? completed / totalCollections : 0,
      ]);

      grandTotal.height = 28;

      grandTotal.eachCell((cell) => {
        cell.font = {
          name: 'Arial',
          size: 10,
          bold: true,
          color: { argb: 'FF14532D' },
        };

        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFDCFCE7' },
        };

        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
        };

        cell.border = {
          top: { style: 'medium', color: { argb: 'FF166534' } },
          bottom: { style: 'double', color: { argb: 'FF166534' } },
        };
      });

      grandTotal.getCell(1).alignment = {
        horizontal: 'left',
        vertical: 'middle',
      };

      grandTotal.getCell(7).numFmt = '0%';

      worksheet.autoFilter = {
        from: 'A5',
        to: `G${5 + byArea.length}`,
      };

      worksheet.views = [
        {
          state: 'frozen',
          ySplit: 5,
        },
      ];

      await downloadWorkbook(
        workbook,
        'collection-summary-by-area.xlsx'
      );
    } catch (error) {
      showExportError(error);
    }
  };

  const exportSchedules = async () => {
    try {
      const workbook = new ExcelJS.Workbook();

      workbook.creator = 'Villanueva Municipal Waste Operations';
      workbook.subject = 'Waste Collection Schedules';
      workbook.title = 'Waste Collection Schedules';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Collection Schedules');

      addReportHeading(
        worksheet,
        'WASTE COLLECTION SCHEDULES',
        'Complete Collection Schedule Report',
        5
      );

      worksheet.columns = [
        { key: 'area', width: 30 },
        { key: 'date', width: 20 },
        { key: 'time', width: 18 },
        { key: 'team', width: 24 },
        { key: 'status', width: 20 },
      ];

      const header = worksheet.getRow(5);
      header.values = [
        'Collection Area',
        'Collection Date',
        'Collection Time',
        'Assigned Team',
        'Status',
      ];

      styleTableHeader(header);

      visibleSchedules.forEach((s, index) => {
        const row = worksheet.addRow([
          s.area || 'Unspecified',
          s.date || '',
          s.time || '',
          s.team || 'Unassigned',
          s.status || 'Scheduled',
        ]);

        styleBodyRow(row, index % 2 === 1);

        row.getCell(2).alignment = {
          horizontal: 'center',
          vertical: 'middle',
        };

        row.getCell(3).alignment = {
          horizontal: 'center',
          vertical: 'middle',
        };

        row.getCell(5).alignment = {
          horizontal: 'center',
          vertical: 'middle',
        };

        const statusCell = row.getCell(5);

        if (s.status === 'Completed') {
          statusCell.font = {
            name: 'Arial',
            size: 10,
            bold: true,
            color: { argb: 'FF15803D' },
          };
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFDCFCE7' },
          };
        } else if (s.status === 'In Progress') {
          statusCell.font = {
            name: 'Arial',
            size: 10,
            bold: true,
            color: { argb: 'FF1D4ED8' },
          };
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFDBEAFE' },
          };
        } else if (s.status === 'Cancelled') {
          statusCell.font = {
            name: 'Arial',
            size: 10,
            bold: true,
            color: { argb: 'FFBE123C' },
          };
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFE4E6' },
          };
        } else {
          statusCell.font = {
            name: 'Arial',
            size: 10,
            bold: true,
            color: { argb: 'FFB45309' },
          };
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFEF3C7' },
          };
        }
      });

      worksheet.autoFilter = {
        from: 'A5',
        to: `E${5 + visibleSchedules.length}`,
      };

      worksheet.views = [
        {
          state: 'frozen',
          ySplit: 5,
        },
      ];

      await downloadWorkbook(
        workbook,
        'waste-collection-schedules.xlsx'
      );
    } catch (error) {
      showExportError(error);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-neutral-200 bg-white dark:border-[#1E2D26] dark:bg-[#121C18]">
        <div className="flex flex-col gap-3 border-b border-neutral-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-[#1E2D26]">
          <div>
            <h2 className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Collections by Area
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              Completion performance across every barangay and collection zone.
            </p>
          </div>

          <button
            type="button"
            onClick={exportAreas}
            disabled={byArea.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 dark:border-[#24362E] dark:bg-[#16231D] dark:text-neutral-200 whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export Area Summary Excel
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/70 text-[11px] font-semibold tracking-wide text-neutral-500 uppercase dark:border-[#1E2D26] dark:bg-[#0E1612] dark:text-neutral-400">
                <th className="px-5 py-3">Area</th>
                <th className="px-5 py-3 text-right">Total</th>
                <th className="px-5 py-3 text-right">Completed</th>
                <th className="px-5 py-3 text-right">In Progress</th>
                <th className="px-5 py-3 text-right">Scheduled</th>
                <th className="px-5 py-3 text-right">Cancelled</th>
                <th className="px-5 py-3">Completion</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-100 dark:divide-[#1E2D26]">
              {byArea.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-sm text-neutral-500 dark:text-neutral-400"
                  >
                    No collection schedules available yet.
                  </td>
                </tr>
              ) : (
                byArea.map((r) => (
                  <tr
                    key={r.area}
                    className="hover:bg-neutral-50/80 dark:hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-3.5 font-medium text-neutral-900 dark:text-neutral-100">
                      {r.area}
                    </td>
                    <td className="tabular-nums px-5 py-3.5 text-right font-mono text-xs">
                      {r.total}
                    </td>
                    <td className="tabular-nums px-5 py-3.5 text-right font-mono text-xs text-emerald-700 dark:text-emerald-400">
                      {r.completed}
                    </td>
                    <td className="tabular-nums px-5 py-3.5 text-right font-mono text-xs text-blue-600 dark:text-blue-400">
                      {r.inProgress}
                    </td>
                    <td className="tabular-nums px-5 py-3.5 text-right font-mono text-xs text-amber-600 dark:text-amber-400">
                      {r.scheduled}
                    </td>
                    <td className="tabular-nums px-5 py-3.5 text-right font-mono text-xs text-rose-600 dark:text-rose-400">
                      {r.cancelled}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-neutral-100 dark:bg-[#1B2B23]">
                          <div
                            className="h-full rounded-full bg-emerald-600"
                            style={{ width: `${r.rate}%` }}
                          />
                        </div>
                        <span className="tabular-nums font-mono text-xs text-neutral-600 dark:text-neutral-300">
                          {r.rate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between dark:border-[#1E2D26] dark:bg-[#121C18]">
        <div>
          <h3 className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
            Full Schedule Export
          </h3>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            Download all visible Firestore collection schedules in a professionally formatted Excel workbook.
          </p>
        </div>

        <button
          type="button"
          onClick={exportSchedules}
          disabled={visibleSchedules.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-40 whitespace-nowrap shrink-0"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Download Schedules Excel
        </button>
      </section>
    </div>
  );
};
