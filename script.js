let table = document.getElementById("tableBody");
let setSelect = document.getElementById("setSelect");

// ==========================
// 🔧 FORMAT DATE
// ==========================
function formatDate(dateStr) {
  if (!dateStr) return "-";
  let d = new Date(dateStr);
  let day = String(d.getDate()).padStart(2, "0");
  let month = String(d.getMonth() + 1).padStart(2, "0");
  let year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// ==========================
// 🔥 EXPIRY CALCULATION
// ==========================
function getStatus(cal, validity) {

  if (!cal || !validity) {
    return { expiry: "-", label: "OK", class: "label-ok" };
  }

  let calDate = new Date(cal);
  let expiry = new Date(calDate);
  expiry.setFullYear(expiry.getFullYear() + parseInt(validity));

  let today = new Date();
  let diff = (expiry - today) / (1000 * 60 * 60 * 24);

  if (diff < 0) {
    return { expiry: formatDate(expiry), label: "EXPIRED", class: "label-expired" };
  } else if (diff <= 30) {
    return { expiry: formatDate(expiry), label: "DUE SOON", class: "label-warning" };
  } else {
    return { expiry: formatDate(expiry), label: "OK", class: "label-ok" };
  }
}

// ==========================
// ➕ ADD SET
// ==========================
function addSet() {

  let name = document.getElementById("setName").value;
  let serial = document.getElementById("setSerial").value;

  if (!name) return alert("Enter set name");

  db.collection("equipment_sets").add({
    name,
    serial
  }).then(() => {
    document.getElementById("setName").value = "";
    document.getElementById("setSerial").value = "";
  });
}

// ==========================
// 🔽 LOAD SET DROPDOWN
// ==========================
function loadSetDropdown() {

  db.collection("equipment_sets").onSnapshot(snapshot => {

    setSelect.innerHTML = "";

    snapshot.forEach(doc => {
      let set = doc.data();

      let option = document.createElement("option");
      option.value = doc.id;
      option.text = `${set.name} (${set.serial})`;

      setSelect.appendChild(option);
    });

  });
}

// ==========================
// ➕ ADD ITEM
// ==========================
function addEquipment() {

  let setId = setSelect.value;

  if (!setId) return alert("Select equipment set");

  let receiptFile = document.getElementById("receiptFile").files[0];
  let certFile = document.getElementById("certFile").files[0];

  let item = {
    tag: tag.value,
    desc: desc.value,
    resit: resit.value,
    qty: qty.value,
    price: price.value,
    cal: cal.value,
    validity: validity.value,
    date: date.value,
    receiptUrl: "",
    certUrl: ""
  };

  uploadFiles(item, receiptFile, certFile, setId);
}

// ==========================
// 🔥 UPLOAD FILES
// ==========================
function uploadFiles(item, receiptFile, certFile, setId) {

  let tasks = [];

  if (receiptFile) {
    let ref = storage.ref("receipts/" + Date.now() + "_" + receiptFile.name);
    tasks.push(
      ref.put(receiptFile)
        .then(s => s.ref.getDownloadURL())
        .then(url => item.receiptUrl = url)
    );
  }

  if (certFile) {
    let ref = storage.ref("certificates/" + Date.now() + "_" + certFile.name);
    tasks.push(
      ref.put(certFile)
        .then(s => s.ref.getDownloadURL())
        .then(url => item.certUrl = url)
    );
  }

  Promise.all(tasks).then(() => {

    db.collection("equipment_sets")
      .doc(setId)
      .collection("items")
      .add(item)
      .then(() => {
        clearForm();
      });

  });
}

// ==========================
// 🔽 TOGGLE GROUP
// ==========================
function toggleSet(id) {
  let rows = document.querySelectorAll(".set-" + id);
  rows.forEach(r => r.classList.toggle("hidden"));
}

// ==========================
// 🗑 DELETE SET (🔥 NEW)
// ==========================
function deleteSet(setId) {

  if (!confirm("Delete this set and ALL items inside?")) return;

  let setRef = db.collection("equipment_sets").doc(setId);

  setRef.collection("items").get().then(snapshot => {

    let batch = db.batch();

    snapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    batch.commit().then(() => {
      setRef.delete();
      alert("Set deleted successfully");
    });

  });
}

// ==========================
// 🔥 LOAD DATA (GROUPED)
// ==========================
function loadData() {

  db.collection("equipment_sets").onSnapshot(snapshot => {

    table.innerHTML = "";

    snapshot.forEach(setDoc => {

      let set = setDoc.data();
      let setId = setDoc.id;

      // 🔥 GROUP HEADER WITH DELETE BUTTON
      table.innerHTML += `
        <tr class="group-row">
          <td colspan="10">
            ▶ <b>${set.name} (${set.serial})</b>

            <button class="btn-delete"
              style="float:right"
              onclick="event.stopPropagation(); deleteSet('${setId}')">
              🗑 Delete Set
            </button>
          </td>
        </tr>
      `;

      db.collection("equipment_sets")
        .doc(setId)
        .collection("items")
        .get()
        .then(itemSnap => {

          let i = 1;

          itemSnap.forEach(doc => {

            let item = doc.data();
            let status = getStatus(item.cal, item.validity);

            table.innerHTML += `
              <tr class="set-${setId}">
                <td>${i++}</td>
                <td>${item.tag || ""}</td>
                <td>${item.desc || ""}</td>
                <td>${item.resit || ""}</td>
                <td>${status.expiry}</td>
                <td><span class="label ${status.class}">${status.label}</span></td>
                <td>${item.qty || ""}</td>
                <td>${item.price || ""}</td>
                <td>${formatDate(item.date)}</td>
                <td>
                  <button class="btn-delete" onclick="deleteItem('${setId}','${doc.id}')">🗑</button>
                </td>
              </tr>
            `;

          });

        });

    });

  });
}

// ==========================
// 🗑 DELETE ITEM
// ==========================
function deleteItem(setId, itemId) {

  if (confirm("Delete item?")) {

    db.collection("equipment_sets")
      .doc(setId)
      .collection("items")
      .doc(itemId)
      .delete();

  }
}

// ==========================
// 🔍 SEARCH
// ==========================
function searchTable() {

  let input = document.getElementById("search").value.toLowerCase();
  let rows = document.querySelectorAll("#tableBody tr");

  rows.forEach(row => {
    row.style.display = row.innerText.toLowerCase().includes(input) ? "" : "none";
  });

}

// ==========================
// 🧹 CLEAR FORM
// ==========================
function clearForm() {
  tag.value = "";
  desc.value = "";
  resit.value = "";
  qty.value = "";
  price.value = "";
  cal.value = "";
  validity.value = "";
  date.value = "";
  receiptFile.value = "";
  certFile.value = "";
}

// ==========================
window.onload = function () {
  loadSetDropdown();
  loadData();
};