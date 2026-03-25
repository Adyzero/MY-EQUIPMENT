let table = document.getElementById("tableBody");
let editId = null;

// FILTER + ALERT
let currentFilter = "ALL";
let alertShown = false;

// 🔧 PRICE
function parsePrice(value) {
  if (!value) return 0;
  return parseFloat(value.toString().replace(/,/g, "")) || 0;
}

// 🔧 DATE FORMAT
function formatDate(dateStr) {
  if (!dateStr) return "";
  let d = new Date(dateStr);

  let day = d.getDate().toString().padStart(2, "0");
  let month = (d.getMonth() + 1).toString().padStart(2, "0");
  let year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

// 🔥 EXPIRY LOGIC
function getExpiryStatus(calDate, validity) {

  if (!calDate || !validity) {
    return { expiry: "-", label: "OK", class: "", priority: 3 };
  }

  let cal = new Date(calDate);
  let expiry = new Date(cal);

  expiry.setFullYear(expiry.getFullYear() + parseInt(validity));

  let today = new Date();
  let diffDays = (expiry - today) / (1000 * 60 * 60 * 24);

  let label = "OK";
  let cssClass = "";
  let priority = 3;

  if (diffDays < 0) {
    label = "EXPIRED";
    cssClass = "expired";
    priority = 1;
  } 
  else if (diffDays <= 30) {
    label = "DUE SOON";
    cssClass = "warning";
    priority = 2;
  }

  return {
    expiry: formatDate(expiry),
    label,
    class: cssClass,
    priority
  };
}

// 🔥 FILTER
function setFilter(type) {
  currentFilter = type;
  loadData();
}

// 🔥 LOAD DATA
function loadData() {

  db.collection("equipment").onSnapshot(snapshot => {

    let data = [];
    let total = 0;
    let expiredCount = 0;
    let dueSoonCount = 0;

    snapshot.forEach(doc => {

      let item = doc.data();
      item.id = doc.id;

      let result = getExpiryStatus(item.cal, item.validity);

      item.expiry = result.expiry;
      item.status = result;

      if (item.status.label === "EXPIRED") expiredCount++;
      if (item.status.label === "DUE SOON") dueSoonCount++;

      item.priceValue = parsePrice(item.price);
      total += item.priceValue;

      data.push(item);
    });

    // SORT
    data.sort((a, b) => a.status.priority - b.status.priority);

    let html = "";

    data.forEach((item, index) => {

      if (currentFilter !== "ALL" && item.status.label !== currentFilter) return;

      let labelClass = "label-ok";
      if (item.status.label === "EXPIRED") labelClass = "label-expired";
      else if (item.status.label === "DUE SOON") labelClass = "label-warning";

      html += `
        <tr class="${item.status.class}">
          <td>${index + 1}</td>
          <td>${item.tag || ""}</td>
          <td>${item.desc || ""}</td>
          <td>${item.serial || ""}</td>
          <td>${item.resit || ""}</td> <!-- ✅ NEW -->
          <td>${item.expiry}</td>
          <td><span class="label ${labelClass}">${item.status.label}</span></td>
          <td>${item.qty || ""}</td>
          <td>${item.price || ""}</td>
          <td>${formatDate(item.date)}</td>
          <td>
            <button class="btn-edit" onclick="editItem('${item.id}')">✏️</button>
            <button class="btn-delete" onclick="deleteItem('${item.id}')">🗑</button>
          </td>
        </tr>
      `;
    });

    table.innerHTML = html;

    // DASHBOARD
    document.getElementById("totalItems").innerText = data.length;
    document.getElementById("totalValue").innerText =
      total.toLocaleString(undefined, { minimumFractionDigits: 2 });

    // ALERT
    if (!alertShown && (expiredCount > 0 || dueSoonCount > 0)) {

      let message = "";

      if (expiredCount > 0) {
        message += `❌ ${expiredCount} equipment EXPIRED\n`;
      }

      if (dueSoonCount > 0) {
        message += `⚠️ ${dueSoonCount} equipment DUE SOON\n`;
      }

      alert(message);
      alertShown = true;
    }

  });
}

// ➕ ADD / UPDATE
function addEquipment() {

  let newItem = {
    tag: tag.value.trim(),
    desc: desc.value.trim(),
    serial: serial.value.trim(),
    resit: resit.value.trim(), // ✅ NEW
    cal: cal.value,
    validity: validity.value,
    qty: qty.value.trim(),
    price: price.value.trim(),
    date: date.value
  };

  if (!newItem.tag || !newItem.desc) {
    alert("Please fill Tagging & Description");
    return;
  }

  if (editId) {
    db.collection("equipment").doc(editId).update(newItem).then(() => {
      editId = null;
      clearForm();
    });
  } else {
    db.collection("equipment").add(newItem).then(() => {
      clearForm();
    });
  }
}

// ✏️ EDIT
function editItem(id) {

  db.collection("equipment").doc(id).get().then(doc => {

    let item = doc.data();

    tag.value = item.tag || "";
    desc.value = item.desc || "";
    serial.value = item.serial || "";
    resit.value = item.resit || ""; // ✅ NEW
    cal.value = item.cal || "";
    validity.value = item.validity || "";
    qty.value = item.qty || "";
    price.value = item.price || "";
    date.value = item.date || "";

    editId = id;
  });
}

// 🗑 DELETE
function deleteItem(id) {
  if (confirm("Delete this item?")) {
    db.collection("equipment").doc(id).delete();
  }
}

// 🔍 SEARCH
function searchTable() {
  let input = search.value.toLowerCase();
  let rows = document.querySelectorAll("#tableBody tr");

  rows.forEach(row => {
    let text = row.innerText.toLowerCase();
    row.style.display = text.includes(input) ? "" : "none";
  });
}

// 📥 EXPORT
function exportToExcel() {
  let rows = document.querySelectorAll("table tr");
  let csv = [];

  rows.forEach(row => {
    let cols = row.querySelectorAll("td, th");
    let rowData = [];

    cols.forEach(col => rowData.push(`"${col.innerText}"`));
    csv.push(rowData.join(","));
  });

  let blob = new Blob([csv.join("\n")], { type: "text/csv" });
  let url = window.URL.createObjectURL(blob);

  let a = document.createElement("a");
  a.href = url;
  a.download = "MY-EQUIPMENT.csv";
  a.click();
}

// 🧹 CLEAR
function clearForm() {
  tag.value = "";
  desc.value = "";
  serial.value = "";
  resit.value = ""; // ✅ NEW
  cal.value = "";
  validity.value = "";
  qty.value = "";
  price.value = "";
  date.value = "";
}

// 🚀 START
window.onload = function () {
  loadData();
};