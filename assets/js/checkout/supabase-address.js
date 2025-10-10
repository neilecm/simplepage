const form = document.getElementById("address-form");
if (!form) {
  console.warn("checkout: address form not found; skipping Supabase address binding");
}

const FIELD_IDS = [
  "recipient-name",
  "phone-number",
  "address-line",
  "province",
  "city",
  "district",
  "postal-code",
  "courier",
  "service",
  "notes",
];

const STORAGE_KEY = "checkout:address";
const saveBuffer = { state: null, timer: null };

function readUserFromStorage() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch (error) {
    console.warn("checkout: unable to parse stored user", error);
    return null;
  }
}

function readSavedAddress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch (error) {
    console.warn("checkout: unable to parse saved address", error);
    return null;
  }
}

function formatAddressPayload(formElement) {
  const payload = {};
  FIELD_IDS.forEach((id) => {
    const field = formElement.querySelector(`#${id}`);
    if (!field) {
      return;
    }
    payload[id] = field.value || "";
    if (field.selectedOptions && field.selectedOptions[0]) {
      payload[`${id}Label`] = field.selectedOptions[0].textContent;
    }
  });
  return payload;
}

function persistAddress(payload) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("checkout: unable to persist address", error);
  }
}

function restoreFieldValues(formElement, payload) {
  if (!payload) {
    return;
  }
  FIELD_IDS.forEach((id) => {
    const field = formElement.querySelector(`#${id}`);
    if (field && Object.prototype.hasOwnProperty.call(payload, id)) {
      field.value = payload[id] ?? "";
    }
  });
}

function debouncePersist(formElement) {
  if (saveBuffer.timer) {
    clearTimeout(saveBuffer.timer);
  }
  saveBuffer.timer = setTimeout(() => {
    const currentState = formatAddressPayload(formElement);
    saveBuffer.state = currentState;
    persistAddress(currentState);
    window.dispatchEvent(
      new CustomEvent("checkout:address-updated", { detail: currentState })
    );
  }, 250);
}

function initUserDefaults(formElement) {
  const user = readUserFromStorage();
  if (!user) {
    return;
  }

  const name = formElement.querySelector("#recipient-name");
  const phone = formElement.querySelector("#phone-number");
  if (name && !name.value) {
    name.value = user.name || "";
  }
  if (phone && !phone.value) {
    phone.value = user.phone || "";
  }
}

function getSupabaseClient() {
  const url =
    window?.ENV?.SUPABASE_URL ||
    window?._env?.SUPABASE_URL ||
    window?.SUPABASE_URL ||
    localStorage.getItem("SUPABASE_URL");
  const key =
    window?.ENV?.SUPABASE_ANON_KEY ||
    window?._env?.SUPABASE_ANON_KEY ||
    window?.SUPABASE_ANON_KEY ||
    localStorage.getItem("SUPABASE_ANON_KEY");

  if (!window?.supabase || !url || !key) {
    return null;
  }

  try {
    return window.supabase.createClient(url, key);
  } catch (error) {
    console.warn("checkout: unable to initialise Supabase client", error);
    return null;
  }
}

async function loadAddressFromSupabase(formElement) {
  const client = getSupabaseClient();
  const user = readUserFromStorage();
  if (!client || !user?.id) {
    return;
  }

  const candidateTables = [
    { table: "addresses", userColumn: "user_id" },
    { table: "user_addresses", userColumn: "user_id" },
    { table: "profiles", userColumn: "id" },
    { table: "users", userColumn: "id" },
  ];

  for (const candidate of candidateTables) {
    try {
      const query = client
        .from(candidate.table)
        .select("*")
        .eq(candidate.userColumn, user.id)
        .limit(1);
      const { data, error } = await query;
      if (error) {
        continue;
      }
      if (Array.isArray(data) && data.length > 0) {
        const record = data[0];
        const payload = {
          "recipient-name": record.recipient_name || record.name || "",
          "phone-number": record.phone || record.phone_number || "",
          "address-line":
            record.address || record.address_line || record.street || "",
          province: record.province_id || record.province || "",
          city: record.city_id || record.city || "",
          district: record.district_id || record.district || "",
          "postal-code": record.postal_code || record.zip || "",
          courier: record.courier || "",
          service: record.service || "",
          notes: record.notes || record.note || "",
        };
        restoreFieldValues(formElement, payload);
        persistAddress({ ...readSavedAddress(), ...payload });
        window.dispatchEvent(
          new CustomEvent("checkout:address-updated", { detail: payload })
        );
        return;
      }
    } catch (error) {
      console.warn(
        `checkout: failed fetching address from table ${candidate.table}`,
        error
      );
    }
  }
}

if (form) {
  const saved = readSavedAddress();
  if (saved) {
    restoreFieldValues(form, saved);
  }
  initUserDefaults(form);
  loadAddressFromSupabase(form);

  form.addEventListener("input", () => debouncePersist(form));
  form.addEventListener("change", () => debouncePersist(form));

  const initialState = formatAddressPayload(form);
  saveBuffer.state = initialState;
  window.dispatchEvent(
    new CustomEvent("checkout:address-initialized", { detail: initialState })
  );
}
