let table = document.getElementById("tableBody");
let editId = null;

// 🔧 Convert price safely
function parsePrice(value) {
  if (!value) return 0;
  return parseFloat(value.toString().replace(/,/g, "")) || 0;
}

// 🔥 CALCULATE EXPIRY + STATUS
function getExpiryStatus(calDate, validity) {

  if (!calDate || !validity) {
    return {
      expiry: "-",
      label: "OK",
      class: "",
      priority: 3
    };
  }

  let cal = new Date(calDate); // from date picker
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
    expiry: expiry.toISOString().split("T")[0], // YYYY-MM-DD
    label: label,
    class: cssClass,
    priority: priority
  };
}

// 🔥 REAL-TIME LOAD + SORT
function loadData() {

  db.collection("equipment").onSnapshot(snapshot => {

    let data = [];
    let total = 0;

    snapshot.forEach(doc => {

      let item = doc.data();
      item.id = doc.id;

      let result = getExpiryStatus(item.cal, item.validity);

      item.expiry = result.expiry;
      item.status = result;

      item.priceValue = parsePrice(item.price);
      total += item.priceValue;

      data.push(item);
    });

    // 🔥 SORT (Expired → Due Soon → OK)
    data.sort((a, b) => a.status.priority - b.status.priority);

    let html = "";

    data.forEach((item, index) => {

      let labelClass = "label-ok";

      if (item.status.label === "EXPIRED") {
        labelClass = "label-expired";
      } else if (item.status.label === "DUE SOON") {
        labelClass = "label-warning";
      }

      html += `
        <tr class="${item.status.class}">
          <td>${index + 1}</td>
          <td>${item.tag || ""}</td>
          <td>${item.desc || ""}</td>
          <td>${item.serial || ""}</td>
          <td>${item.expiry}</td>
          <td><span class="label ${labelClass}">${item.status.label}</span></td>
          <td>${item.qty || ""}</td>
          <td>${item.price || ""}</td>
          <td>${item.date || ""}</td>
          <td>
            <button class="btn-edit" onclick="editItem('${item.id}')">✏️</button>
            <button class="btn-delete" onclick="deleteItem('${item.id}')">🗑</button>
          </td>
        </tr>
      `;
    });

    table.innerHTML = html;

    // 📊 DASHBOARD
    document.getElementById("totalItems").innerText = data.length;
    document.getElementById("totalValue").innerText =
      total.toLocaleString(undefined, { minimumFractionDigits: 2 });

  });
}

// ➕ ADD / ✏️ UPDATE
function addEquipment() {

  let newItem = {
    tag: document.getElementById("tag").value.trim(),
    desc: document.getElementById("desc").value.trim(),
    serial: document.getElementById("serial").value.trim(),
    cal: document.getElementById("cal").value, // date picker
    validity: document.getElementById("validity").value,
    qty: document.getElementById("qty").value.trim(),
    price: document.getElementById("price").value.trim(),
    date: document.getElementById("date").value
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

    document.getElementById("tag").value = item.tag || "";
    document.getElementById("desc").value = item.desc || "";
    document.getElementById("serial").value = item.serial || "";
    document.getElementById("cal").value = item.cal || "";
    document.getElementById("validity").value = item.validity || "";
    document.getElementById("qty").value = item.qty || "";
    document.getElementById("price").value = item.price || "";
    document.getElementById("date").value = item.date || "";

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

  let input = document.getElementById("search").value.toLowerCase();
  let rows = document.querySelectorAll("#tableBody tr");

  rows.forEach(row => {
    let text = row.innerText.toLowerCase();
    row.style.display = text.includes(input) ? "" : "none";
  });
}

// 📥 EXPORT CSV
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

// 🧹 CLEAR FORM
function clearForm() {
  document.getElementById("tag").value = "";
  document.getElementById("desc").value = "";
  document.getElementById("serial").value = "";
  document.getElementById("cal").value = "";
  document.getElementById("validity").value = "";
  document.getElementById("qty").value = "";
  document.getElementById("price").value = "";
  document.getElementById("date").value = "";
}

// 🚀 START
window.onload = function () {
  loadData();
};