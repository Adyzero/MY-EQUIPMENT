let table = document.getElementById("tableBody");
let setSelect = document.getElementById("setSelect");

let listeners = {};
let allData = [];

let editingItem = null;
let editingSet = null;

// ==========================
function formatDate(dateStr) {
  if (!dateStr) return "-";
  let d = new Date(dateStr);
  if (isNaN(d)) return "-";
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
}

// ==========================
// 🔥 IMPROVED STATUS
function getStatus(cal, validity) {

  if (!cal || !validity) {
    return { expiry: "-", label: "-", class: "" };
  }

  let expiry = new Date(cal);
  expiry.setFullYear(expiry.getFullYear() + Number(validity));

  let today = new Date();
  let diffDays = (expiry - today) / (1000 * 60 * 60 * 24);

  if (diffDays < 0) {
    return {
      expiry: formatDate(expiry),
      label: "❌ EXPIRED",
      class: "status-expired",
      rowClass: "row-expired"
    };
  }

  if (diffDays <= 30) {
    return {
      expiry: formatDate(expiry),
      label: "⚠️ DUE SOON",
      class: "status-warning"
    };
  }

  return {
    expiry: formatDate(expiry),
    label: "✅ OK",
    class: "status-ok"
  };
}

// ==========================
// ADD / EDIT SET
function addSet() {

  let name = document.getElementById("setName").value.trim();
  let serial = document.getElementById("setSerial").value.trim();

  if (!name) return alert("Enter set name");

  if (editingSet) {
    db.collection("equipment_sets").doc(editingSet).update({ name, serial });
    editingSet = null;
  } else {
    db.collection("equipment_sets").add({ name, serial });
  }

  document.getElementById("setName").value = "";
  document.getElementById("setSerial").value = "";
}

// ==========================
function loadSetDropdown() {
  db.collection("equipment_sets").onSnapshot(snap => {
    setSelect.innerHTML = "";
    snap.forEach(doc => {
      let s = doc.data();
      setSelect.innerHTML += `
        <option value="${doc.id}">
          ${s.name} (${s.serial})
        </option>
      `;
    });
  });
}

// ==========================
// ADD / EDIT ITEM
function addEquipment() {

  let setId = setSelect.value;

  let item = {
    tag: document.getElementById("tag").value.trim(),
    desc: document.getElementById("desc").value.trim(),
    resit: document.getElementById("resit").value.trim(),
    qty: document.getElementById("qty").value.trim(),
    price: document.getElementById("price").value.trim(),
    cal: document.getElementById("cal").value,
    validity: document.getElementById("validity").value,
    date: document.getElementById("date").value
  };

  if (!item.tag || !item.desc) {
    alert("Fill Tag & Description");
    return;
  }

  if (editingItem) {
    db.collection("equipment_sets")
      .doc(editingItem.setId)
      .collection("items")
      .doc(editingItem.id)
      .update(item);

    editingItem = null;
    clearForm();
    return;
  }

  db.collection("equipment_sets")
    .doc(setId)
    .collection("items")
    .add(item);

  clearForm();
}

// ==========================
// EDIT ITEM
function editItem(setId, itemId) {

  let set = allData.find(s => s.id === setId);
  let item = set.items.find(i => i.id === itemId);

  editingItem = { setId, id: itemId };

  setSelect.value = setId;

  document.getElementById("tag").value = item.tag || "";
  document.getElementById("desc").value = item.desc || "";
  document.getElementById("resit").value = item.resit || "";
  document.getElementById("qty").value = item.qty || "";
  document.getElementById("price").value = item.price || "";
  document.getElementById("cal").value = item.cal || "";
  document.getElementById("validity").value = item.validity || "";
  document.getElementById("date").value = item.date || "";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ==========================
// EDIT SET
function editSet(id, name, serial) {
  editingSet = id;

  document.getElementById("setName").value = name;
  document.getElementById("setSerial").value = serial;

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ==========================
function deleteItem(setId, itemId) {
  if (!confirm("Delete item?")) return;

  db.collection("equipment_sets")
    .doc(setId)
    .collection("items")
    .doc(itemId)
    .delete();
}

// ==========================
function deleteSet(setId) {
  if (!confirm("Delete set + all items?")) return;

  let ref = db.collection("equipment_sets").doc(setId);

  ref.collection("items").get().then(snap => {
    let batch = db.batch();
    snap.forEach(doc => batch.delete(doc.ref));
    batch.commit().then(() => ref.delete());
  });
}

// ==========================
// LIVE DATA
function loadData() {

  db.collection("equipment_sets").onSnapshot(setSnap => {

    table.innerHTML = "";
    allData = [];

    Object.values(listeners).forEach(unsub => unsub());
    listeners = {};

    setSnap.forEach(setDoc => {

      let set = setDoc.data();
      let setId = setDoc.id;

      let setObj = {
        id: setId,
        name: set.name,
        serial: set.serial,
        items: []
      };

      let unsubscribe = db.collection("equipment_sets")
        .doc(setId)
        .collection("items")
        .onSnapshot(itemSnap => {

          setObj.items = [];
          itemSnap.forEach(doc => {
            setObj.items.push({ id: doc.id, ...doc.data() });
          });

          renderData();
        });

      listeners[setId] = unsubscribe;
      allData.push(setObj);

    });

  });
}

// ==========================
// RENDER
function renderData(filtered = null) {

  let data = filtered || allData;

  table.innerHTML = "";

  data.forEach(set => {

    if (set.items.length === 0) return;

    let groupRow = document.createElement("tr");
    groupRow.className = "group-row";

    groupRow.innerHTML = `
      <td colspan="9">
        ▶ <b>${set.name} (${set.serial})</b>
      </td>
      <td>
        <div class="action-group">
          <button class="btn-action edit"
            onclick="editSet('${set.id}','${set.name}','${set.serial}')">✏️</button>

          <button class="btn-action delete"
            onclick="deleteSet('${set.id}')">🗑</button>
        </div>
      </td>
    `;

    table.appendChild(groupRow);

    let i = 1;

    set.items.forEach(item => {

      let s = getStatus(item.cal, item.validity);

      let row = document.createElement("tr");
      if (s.rowClass) row.classList.add(s.rowClass);

      row.innerHTML = `
        <td>${i++}</td>
        <td>${item.tag}</td>
        <td>${item.desc}</td>
        <td>${item.resit}</td>
        <td>${s.expiry}</td>
        <td><span class="label ${s.class}">${s.label}</span></td>
        <td>${item.qty}</td>
        <td>${item.price}</td>
        <td>${formatDate(item.date)}</td>
        <td>
          <div class="action-group">
            <button class="btn-action edit"
              onclick="editItem('${set.id}','${item.id}')">✏️</button>

            <button class="btn-action delete"
              onclick="deleteItem('${set.id}','${item.id}')">🗑</button>
          </div>
        </td>
      `;

      table.appendChild(row);
    });

  });
}

// ==========================
// SEARCH
function searchTable() {

  let keyword = document.getElementById("search").value.toLowerCase();

  if (!keyword) {
    renderData();
    return;
  }

  let filtered = [];

  allData.forEach(set => {

    let matchSet = (set.name + " " + set.serial).toLowerCase().includes(keyword);

    let matchedItems = set.items.filter(item => {
      let text = (
        item.tag + " " +
        item.desc + " " +
        item.resit + " " +
        item.qty + " " +
        item.price + " " +
        item.cal + " " +
        item.date
      ).toLowerCase();

      return text.includes(keyword);
    });

    if (matchSet || matchedItems.length > 0) {
      filtered.push({
        ...set,
        items: matchSet ? set.items : matchedItems
      });
    }

  });

  renderData(filtered);
}

// ==========================
function clearForm() {
  document.getElementById("tag").value = "";
  document.getElementById("desc").value = "";
  document.getElementById("resit").value = "";
  document.getElementById("qty").value = "";
  document.getElementById("price").value = "";
  document.getElementById("cal").value = "";
  document.getElementById("validity").value = "";
  document.getElementById("date").value = "";
}

// ==========================
window.onload = function () {
  loadSetDropdown();
  loadData();
};