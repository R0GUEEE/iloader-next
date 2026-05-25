use isideload::auth::apple_account::AppleAccount;
use rootcause::Report;
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::wasm_bindgen;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[wasm_bindgen(getter_with_clone)]
pub struct Account {
    pub email: String,
    pub first_name: String,
    pub last_name: String,
}

impl Account {
    pub fn from_account(account: &AppleAccount) -> Result<Self, Report> {
        let (first, last) = account.get_name()?;
        Ok(Self {
            email: account.email.clone(),
            first_name: first.into(),
            last_name: last.into(),
        })
    }
}
