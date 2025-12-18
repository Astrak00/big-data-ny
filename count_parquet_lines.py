import sys
import pyarrow.parquet as pq

def count_lines(file_path):
    try:
        metadata = pq.read_metadata(file_path)
        print(f"File: {file_path}")
        print(f"Number of rows: {metadata.num_rows}")
    except Exception as e:
        print(f"Error reading {file_path}: {e}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python count_parquet_lines.py <parquet_file_path>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    count_lines(file_path)
