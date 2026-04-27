import * as XLSX from 'xlsx';
import fs from 'fs';

const buf = fs.readFileSync('/tmp/STATOS_DE_TODAS_AS_LOJAS.xlsx');
const workbook = XLSX.read(buf, { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log(JSON.stringify(data, null, 2));
