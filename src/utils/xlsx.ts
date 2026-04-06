import { Buffer } from "buffer";

export type XlsxColumnType = "string" | "number" | "currency";

export interface XlsxColumn {
  header: string;
  width?: number;
  type?: XlsxColumnType;
}

export interface XlsxSheetData {
  name: string;
  columns: XlsxColumn[];
  rows: Array<Array<string | number | null | undefined>>;
}

const crcTable = new Uint32Array(256).map((_, index) => {
  let current = index;

  for (let bit = 0; bit < 8; bit += 1) {
    current =
      (current & 1) === 1 ? 0xedb88320 ^ (current >>> 1) : current >>> 1;
  }

  return current >>> 0;
});

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const toColumnName = (index: number): string => {
  let current = index + 1;
  let result = "";

  while (current > 0) {
    const remainder = (current - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    current = Math.floor((current - 1) / 26);
  }

  return result;
};

const createBuffer = (size: number): Buffer => Buffer.alloc(size);

const toDosDateTime = (date: Date): { date: number; time: number } => {
  const year = Math.max(date.getFullYear(), 1980);
  const dosDate =
    ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  const dosTime =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);

  return {
    date: dosDate,
    time: dosTime,
  };
};

const crc32 = (buffer: Buffer): number => {
  let current = 0xffffffff;

  for (const byte of buffer) {
    current = crcTable[(current ^ byte) & 0xff] ^ (current >>> 8);
  }

  return (current ^ 0xffffffff) >>> 0;
};

const createLocalFileHeader = (
  fileName: Buffer,
  data: Buffer,
  offsetDate: { date: number; time: number },
): Buffer => {
  const header = createBuffer(30);
  const checksum = crc32(data);

  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(offsetDate.time, 10);
  header.writeUInt16LE(offsetDate.date, 12);
  header.writeUInt32LE(checksum, 14);
  header.writeUInt32LE(data.length, 18);
  header.writeUInt32LE(data.length, 22);
  header.writeUInt16LE(fileName.length, 26);
  header.writeUInt16LE(0, 28);

  return Buffer.concat([header, fileName, data]);
};

const createCentralDirectoryHeader = (params: {
  fileName: Buffer;
  data: Buffer;
  offset: number;
  offsetDate: { date: number; time: number };
}): Buffer => {
  const { fileName, data, offset, offsetDate } = params;
  const header = createBuffer(46);
  const checksum = crc32(data);

  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(offsetDate.time, 12);
  header.writeUInt16LE(offsetDate.date, 14);
  header.writeUInt32LE(checksum, 16);
  header.writeUInt32LE(data.length, 20);
  header.writeUInt32LE(data.length, 24);
  header.writeUInt16LE(fileName.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(offset, 42);

  return Buffer.concat([header, fileName]);
};

const createEndOfCentralDirectory = (
  entryCount: number,
  centralDirectorySize: number,
  centralDirectoryOffset: number,
): Buffer => {
  const header = createBuffer(22);

  header.writeUInt32LE(0x06054b50, 0);
  header.writeUInt16LE(0, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(entryCount, 8);
  header.writeUInt16LE(entryCount, 10);
  header.writeUInt32LE(centralDirectorySize, 12);
  header.writeUInt32LE(centralDirectoryOffset, 16);
  header.writeUInt16LE(0, 20);

  return header;
};

const buildZip = (entries: Array<{ name: string; data: string }>): Buffer => {
  const now = toDosDateTime(new Date());
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let currentOffset = 0;

  entries.forEach((entry) => {
    const fileName = Buffer.from(entry.name, "utf8");
    const data = Buffer.from(entry.data, "utf8");
    const localPart = createLocalFileHeader(fileName, data, now);
    const centralPart = createCentralDirectoryHeader({
      fileName,
      data,
      offset: currentOffset,
      offsetDate: now,
    });

    localParts.push(localPart);
    centralParts.push(centralPart);
    currentOffset += localPart.length;
  });

  const centralDirectory = Buffer.concat(centralParts);
  const end = createEndOfCentralDirectory(
    entries.length,
    centralDirectory.length,
    currentOffset,
  );

  return Buffer.concat([...localParts, centralDirectory, end]);
};

const createStringCell = (
  columnIndex: number,
  rowIndex: number,
  value: string,
  styleIndex?: number,
): string => {
  const ref = `${toColumnName(columnIndex)}${rowIndex}`;
  const styleAttr = styleIndex !== undefined ? ` s="${styleIndex}"` : "";

  return `<c r="${ref}" t="inlineStr"${styleAttr}><is><t xml:space="preserve">${escapeXml(
    value,
  )}</t></is></c>`;
};

const createNumberCell = (
  columnIndex: number,
  rowIndex: number,
  value: number,
  styleIndex?: number,
): string => {
  const ref = `${toColumnName(columnIndex)}${rowIndex}`;
  const styleAttr = styleIndex !== undefined ? ` s="${styleIndex}"` : "";

  return `<c r="${ref}"${styleAttr}><v>${value}</v></c>`;
};

const buildWorksheetXml = (sheet: XlsxSheetData): string => {
  const rowCount = sheet.rows.length + 1;
  const lastColumn = toColumnName(Math.max(sheet.columns.length - 1, 0));
  const dimension = `A1:${lastColumn}${rowCount}`;
  const columnsXml = sheet.columns
    .map(
      (column, index) =>
        `<col min="${index + 1}" max="${index + 1}" width="${
          column.width ?? 18
        }" customWidth="1"/>`,
    )
    .join("");

  const headerRowXml = sheet.columns
    .map((column, index) => createStringCell(index, 1, column.header, 1))
    .join("");

  const dataRowsXml = sheet.rows
    .map((row, rowIndex) => {
      const cellsXml = row
        .map((cellValue, columnIndex) => {
          const column = sheet.columns[columnIndex];
          if (cellValue === null || cellValue === undefined || cellValue === "") {
            return createStringCell(columnIndex, rowIndex + 2, "");
          }

          if (
            typeof cellValue === "number" &&
            Number.isFinite(cellValue) &&
            column?.type !== "string"
          ) {
            const styleIndex = column?.type === "currency" ? 2 : undefined;
            return createNumberCell(
              columnIndex,
              rowIndex + 2,
              cellValue,
              styleIndex,
            );
          }

          return createStringCell(
            columnIndex,
            rowIndex + 2,
            String(cellValue),
          );
        })
        .join("");

      return `<row r="${rowIndex + 2}">${cellsXml}</row>`;
    })
    .join("");

  const autoFilter =
    rowCount > 1 ? `<autoFilter ref="${dimension}"/>` : "";

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="${dimension}"/>
  <sheetViews>
    <sheetView workbookViewId="0">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <cols>${columnsXml}</cols>
  <sheetData>
    <row r="1">${headerRowXml}</row>
    ${dataRowsXml}
  </sheetData>
  ${autoFilter}
</worksheet>`;
};

const buildStylesXml = (): string => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1">
    <numFmt numFmtId="164" formatCode="&quot;£&quot;#,##0.00"/>
  </numFmts>
  <fonts count="2">
    <font>
      <sz val="11"/>
      <name val="Calibri"/>
      <family val="2"/>
    </font>
    <font>
      <b/>
      <sz val="11"/>
      <name val="Calibri"/>
      <family val="2"/>
    </font>
  </fonts>
  <fills count="2">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
  </fills>
  <borders count="1">
    <border>
      <left/>
      <right/>
      <top/>
      <bottom/>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="3">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
</styleSheet>`;

export const buildXlsxWorkbook = (sheet: XlsxSheetData): Buffer => {
  const escapedSheetName = escapeXml(sheet.name);
  const worksheetXml = buildWorksheetXml(sheet);
  const stylesXml = buildStylesXml();

  return buildZip([
    {
      name: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
    },
    {
      name: "_rels/.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${escapedSheetName}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    },
    {
      name: "xl/worksheets/sheet1.xml",
      data: worksheetXml,
    },
    {
      name: "xl/styles.xml",
      data: stylesXml,
    },
  ]);
};
