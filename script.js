let table = document.getElementById("tableBody");
let editId = null;

// 🔧 Helper: clean price
function parsePrice(value) {
  if (!value) return 0;
  return parseFloat(value.toString().replace(/,/g, "")) || 0;
}

// 🔥 EXPIRY CHECK
function getStatus(cal) {

  if (!cal) return { class: "", label: "OK", priority: 3 };

  let parts = cal.split("/");
  if (parts.length !== 3) return { class: "", label: "OK", priority: 3 };

  let date = new Date(parts[2], parts[1] - 1, parts[0]);

  let expiry = new Date(date);
  expiry.setFullYear(expiry.getFullYear() + 1);

  let today = new Date();
  let diff = (expiry - today) / (1000 * 60 * 60 * 24);

  if (diff < 0) return { class: "expired", label: "EXPIRED", priority: 1 };
  if (diff <= 30) return { class: "warning", label: "DUE SOON", priority: 2 };

  return { class: "", label: "OK", priority: 3 };
}

// 🔥 REAL-TIME LOAD + SORT
function loadData() {

  db.collection("equipment").onSnapshot(snapshot => {

    let data = [];
    let total = 0;

    snapshot.forEach(doc => {
      let item = doc.data();
      item.id = doc.id;

      item.status = getStatus(item.cal);
      item.priceValue = parsePrice(item.price);

      total += item.priceValue;

      data.push(item);
    });

    // 🔥 SORT by priority (expired first)
    data.sort((a, b) => a.status.priority - b.status.priority);

    let html = "";

    data.forEach((item, index) => {

      let label = "";

      if (item.status.label === "EXPIRED") {
        label = `<span class="label label-expired">EXPIRED</span>`;
      } else if (item.status.label === "DUE SOON") {
        label = `<span class="label label-warning">DUE SOON</span>`;
      } else {
        label = `<span class="label label-ok">OK</span>`;
      }

      html += `
        <tr class="${item.status.class}">
          <td>${index + 1}</td>
          <td>${item.tag || ""}</td>
          <td>${item.desc || ""}</td>
          <td>${item.serial || ""}</td>
          <td>${item.cal || ""}</td>
          <td>${label}</td>
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
    cal: document.getElementById("cal").value.trim(),
    qty: document.getElementById("qty").value.trim(),
    price: document.getElementById("price").value.trim(),
    date: document.getElementById("date").value.trim()
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
  document.getElementById("qty").value = "";
  document.getElementById("price").value = "";
  document.getElementById("date").value = "";
}

// 🚀 START
window.onload = function () {
  loadData();
};