//! Data transformers - clean and normalize data
//! 
//! Transformations are applied inline during the load process.
//! This module is reserved for future complex transformations.

pub fn normalize_borough(boro: &str) -> String {
    match boro.to_uppercase().trim() {
        "M" | "MN" | "MANHATTAN" => "Manhattan".to_string(),
        "K" | "BK" | "BROOKLYN" => "Brooklyn".to_string(),
        "Q" | "QN" | "QUEENS" => "Queens".to_string(),
        "B" | "BX" | "BRONX" => "Bronx".to_string(),
        "S" | "SI" | "STATEN ISLAND" => "Staten Island".to_string(),
        other => other.to_string(),
    }
}

pub fn clean_string(s: &str) -> String {
    s.trim()
        .replace("\n", " ")
        .replace("\r", "")
        .replace("  ", " ")
}
