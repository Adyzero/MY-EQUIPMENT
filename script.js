let table = document.getElementById("tableBody");
let editId = null;

// 🔧 Helper: clean price (remove comma, convert to number)
function parsePrice(value) {
  if (!value) return 0;
  return parseFloat(value.toString().replace(/,/g, "")) || 0;
}

// 🔥 REAL-TIME LOAD
function loadData() {

  db.collection("equipment").onSnapshot(snapshot => {

    let html = "";
    let i = 1;
    let total = 0;
    let count = 0;

    snapshot.forEach(doc => {
      let item = doc.data();
      let id = doc.id;

      count++;

      let price = parsePrice(item.price);
      total += price;

      html += `
        <tr>
          <td>${i++}</td>
          <td>${item.tag || ""}</td>
          <td>${item.desc || ""}</td>
          <td>${item.serial || ""}</td>
          <td>${item.cal || ""}</td>
          <td>${item.qty || ""}</td>
          <td>${item.price || ""}</td>
          <td>${item.date || ""}</td>
          <td>
            <button class="btn-edit" onclick="editItem('${id}')">✏️</button>
            <button class="btn-delete" onclick="deleteItem('${id}')">🗑</button>
          </td>
        </tr>
      `;
    });

    table.innerHTML = html;

    // 📊 DASHBOARD UPDATE
    let totalItems = document.getElementById("totalItems");
    let totalValue = document.getElementById("totalValue");

    if (totalItems && totalValue) {
      totalItems.innerText = count;
      totalValue.innerText = total.toLocaleString(undefined, {
        minimumFractionDigits: 2
      });
    }

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

  // ❗ Basic validation
  if (!newItem.tag || !newItem.desc) {
    alert("Please fill at least Tagging & Description");
    return;
  }

  if (editId) {
    // ✏️ UPDATE
    db.collection("equipment").doc(editId).update(newItem).then(() => {
      editId = null;
      clearForm();
    });
  } else {
    // ➕ ADD
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