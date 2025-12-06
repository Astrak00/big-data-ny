import { parquetRead } from 'hyparquet';
import { readFileSync } from 'fs';

const buffer = readFileSync('./data_trunc/yellow_tripdata_2024-12.parquet');
const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

await parquetRead({
  file: arrayBuffer,
  rowEnd: 5,
  onComplete: (data: any) => {
    console.log("Sample rows:");
    console.log(JSON.stringify(data, null, 2));
  }
});
