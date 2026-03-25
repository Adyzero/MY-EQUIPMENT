let equipment = JSON.parse(localStorage.getItem("equipment"));

if (!equipment || equipment.length === 0) {
  equipment = [
    {
      no: 1,
      tag: "MY-FLUKE (1) - 1.0",
      desc: "Fluke 1732 c/w Power Adaptor",
      serial: "39764215",
      cal: "9/1/2026",
      qty: "1 set",
      price: "14628.00",
      date: "19/1/2018"
    },
    {
      no: 2,
      tag: "MY-FLUKE (1) - 2.0",
      desc: "Current Clamp 3000A",
      serial: "-",
      cal: "-",
      qty: "1 set (3 units)",
      price: "2862.00",
      date: "2/1/2018"
    }
  ];

  // 🔥 SAVE default data
  localStorage.setItem("equipment", JSON.stringify(equipment));
}

let table = document.getElementById("tableBody");

function displayData(data) {
  table.innerHTML = "";

  for (let i = 0; i < data.length; i++) {
    let item = data[i];

    let row =
  "<tr>" +
  "<td>" + item.no + "</td>" +
  "<td>" + item.tag + "</td>" +
  "<td>" + item.desc + "</td>" +
  "<td>" + item.serial + "</td>" +
  "<td>" + item.cal + "</td>" +
  "<td>" + item.qty + "</td>" +
  "<td>" + item.price + "</td>" +
  "<td>" + item.date + "</td>" +

  "<td>" +
  "<button class='btn-edit' onclick='editItem(" + i + ")'>✏️</button> " +
"<button class='btn-delete' onclick='deleteItem(" + i + ")'>🗑</button>"
  "</td>" +

  "</tr>";

    table.innerHTML += row;
  }
}

function searchTable() {
  let input = document.getElementById("search").value.toLowerCase();

  let filtered = [];

  for (let i = 0; i < equipment.length; i++) {
    let item = equipment[i];

    if (
      item.tag.toLowerCase().includes(input) ||
      item.desc.toLowerCase().includes(input) ||
      item.serial.toLowerCase().includes(input) ||
      item.date.toLowerCase().includes(input)
    ) {
      filtered.push(item);
    }
  }

  displayData(filtered);
}

// IMPORTANT
displayData(equipment);

function addEquipment() {

  let newItem = {
    no: equipment.length + 1,
    tag: document.getElementById("tag").value,
    desc: document.getElementById("desc").value,
    serial: document.getElementById("serial").value,
    cal: document.getElementById("cal").value,
    qty: document.getElementById("qty").value,
    price: document.getElementById("price").value,
    date: document.getElementById("date").value
  };

  equipment.push(newItem);

  // 🔥 SAVE DATA
  localStorage.setItem("equipment", JSON.stringify(equipment));

  displayData(equipment);

  // clear input
  document.getElementById("tag").value = "";
  document.getElementById("desc").value = "";
  document.getElementById("serial").value = "";
  document.getElementById("cal").value = "";
  document.getElementById("qty").value = "";
  document.getElementById("price").value = "";
  document.getElementById("date").value = "";
}

function deleteItem(index) {

  if (confirm("Are you sure to delete?")) {
    equipment.splice(index, 1);

    localStorage.setItem("equipment", JSON.stringify(equipment));

    displayData(equipment);
  }
}

function editItem(index) {

  let item = equipment[index];

  document.getElementById("tag").value = item.tag;
  document.getElementById("desc").value = item.desc;
  document.getElementById("serial").value = item.serial;
  document.getElementById("cal").value = item.cal;
  document.getElementById("qty").value = item.qty;
  document.getElementById("price").value = item.price;
  document.getElementById("date").value = item.date;

  // remove old data
  equipment.splice(index, 1);

  localStorage.setItem("equipment", JSON.stringify(equipment));

  displayData(equipment);
}

function exportToExcel() {

  let csv = "No,Tagging,Description,Serial,Calibration,Qty,Price,Date\n";

  equipment.forEach(item => {
    csv += `${item.no},${item.tag},${item.desc},${item.serial},${item.cal},${item.qty},${item.price},${item.date}\n`;
  });

  let blob = new Blob([csv], { type: "text/csv" });
  let url = window.URL.createObjectURL(blob);

  let a = document.createElement("a");
  a.href = url;
  a.download = "MY-EQUIPMENT.csv";
  a.click();
}