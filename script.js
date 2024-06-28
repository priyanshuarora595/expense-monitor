let userToken = '';
let userID = '';
let userEmail = '';
let expense_data = '';
let sourcesList = '';
let commoditiesList = '';
let balancesList = '';
let internalTransactionsData = '';
let yearOptions = `<option value="">-----------</option>`;
let last_req_url = ``;

let maxDate = (new Date().getFullYear()) + "-" + (new Date().getMonth() + 1);
let currYear = new Date().getFullYear();



function login_redirect() {
    window.location.href = 'index.html';
    localStorage.clear();
}
function get_userData() {
    if (localStorage.getItem("userToken") && localStorage.getItem("userID") && localStorage.getItem("userEmail")) {

        return true;
    } else {
        return false
    }
}

function check_user_logged_in() {
    if (localStorage.getItem('logged_in') == '1') {
        userToken = localStorage.getItem("userToken");
        userID = localStorage.getItem("userID");
        userEmail = localStorage.getItem("userEmail");
        return true;
    } else {
        return false;
    }
}

// Event listener to close the modal if the user clicks outside of it
window.onclick = function (event) {
    var modals = document.querySelectorAll('.modal');
    modals.forEach(function (modal) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
};


function createYearDropdown() {
    for (var year = 2015; year <= 2115; year++) {
        if (year == currYear) yearOptions += `<option value="${year}" selected>${year}</option>`;
        else yearOptions += `<option value="${year}">${year}</option>`;
    }
}

function openNav() {
    document.getElementById("mySidebar").style.width = "70%";
    document.getElementById("mySidebar").style.overflow = "auto";
    // document.getElementsByClassName("page-content")[0].style.marginLeft = "250px";
}

function closeNav() {
    document.getElementById("mySidebar").style.width = "0px";
    document.getElementById("mySidebar").style.overflow = "hidden";
    // document.getElementsByClassName("page-content")[0].style.marginLeft = "0";
}


function openModal(modalContentId, index = null, sources = sourcesList, commodities = commoditiesList, balances = balancesList) {
    let transaction = '';
    if (index != null) {
        transaction = expense_data[index];
    }
    const modal = document.getElementById('Modal');
    const modalContent = document.getElementById(modalContentId);
    modal.style.display = 'block';
    var saveButton = document.getElementById('modal-save-btn');
    saveButton = customRemoveEventListeners(saveButton);
    switch (modalContentId) {

        case "addExpenseModalContent":
            source_options = ``
            sourcesList.forEach(function (source) {
                if (source.is_active) {
                    if (source.default) {
                        source_options += `
                        <option value="${source.id}" selected>${source.name}</option>`;
                    }
                    else {

                        source_options += `
                        <option value="${source.id}">${source.name}</option>`;
                    }
                }
            })

            commodity_options = `<option value="">-------------</option>`;
            commoditiesList.forEach(function (commodity) {
                commodity_options += `
        <option value="${commodity.id}">${commodity.name}</option>`;
            })
            modalContent.innerHTML = `
      <form>
        <div class="form-group">
        <label for="addDate">Date:</label>
        <input type="datetime-local" id="addExpenseDate" name="addDate">
        </div>

        <div class="form-group">
        <label for="addSource">Source:</label>
        <select class="form-control" id="addExpenseSource" name="addSource">
          `+ source_options + `
        </select>
        </div>

        <div class="form-group">
        <label for="addType">Transaction Type:</label>
        <select class="form-control" id="addExpenseType" name="addType">
        <option value="debit">debit</option>
          <option value="credit">credit</option>
        </select>
      </div>
        <div class="form-group">
        <label for="addAmount">Amount:</label>
        <input type="number" id="addExpenseAmount" name="addAmount"  >
      </div>
        <div class="form-group">
        <label for="addCommodity">Commodity:</label>
        <select class="form-control" id="addExpenseCommodity" name="addCommodity">
          `+ commodity_options + `
        </select>
      </div>
        <div class="form-group">
        <label for="addComments">Comments:</label>
        <input type="text" id="addExpenseComments" name="addComments"  >
      </div>
      </form>`
            saveButton.addEventListener('click', addExpenseSave);
            var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
            var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -5);
            document.getElementById('addExpenseDate').value = localISOTime;
            break;

        case 'editExpenseModalContent':
            source_options = ``
            sourcesList.forEach(function (source) {
                if (source.is_active) {

                    if (source.id == transaction.source.id) {
                        source_options += `
                        <option value="${source.id}" selected >${source.name}</option>`;
                    } else {
                        source_options += `
                        <option value="${source.id}">${source.name}</option>`;
                    }
                }
            });

            commodity_options = ``;
            commoditiesList.forEach(function (commodity) {
                if (commodity.id == transaction.commodity.id) {
                    commodity_options += `
      <option value="${commodity.id}" selected>${commodity.name}</option>`;
                } else {

                    commodity_options += `
            <option value="${commodity.id}">${commodity.name}</option>`;
                }
            });

            var transaction_type = `<option value="debit" selected>debit</option>
        <option value="credit">credit</option>;
        `;
            if (transaction.transaction_type == "credit") {
                transaction_type = `<option value="credit" selected >credit</option>
          <option value="debit">debit</option>`;
            }

            modalContent.innerHTML = `
      <form>
        <div class="form-group">
        <label for="editExpenseDate">Date:</label>
        <input type="datetime-local" id="editExpenseDate" name="editExpenseDate" value='${transaction.date}'>
        </div>

        <div class="form-group">
          <label for="editExpenseSource">Source:</label>
          <select class="form-control" id="editExpenseSource" name="editExpenseSource" >
            `+ source_options + `
          </select>
          </div>
  
          <div class="form-group">
          <label for="editExpenseType">Transaction Type:</label>
          <select class="form-control" id="editExpenseType" name="editExpenseType" >
            `+ transaction_type + `
          </select>
        </div>
          <div class="form-group">
          <label for="editExpenseAmount">Amount:</label>
          <input type="number" id="editExpenseAmount" name="editExpenseAmount"  value='${transaction.amount}'>
        </div>
          <div class="form-group">
          <label for="editExpenseCommodity">Commodity:</label>
          <select class="form-control" id="editExpenseCommodity" name="editExpenseCommodity" >
            `+ commodity_options + `
          </select>
        </div>
        <div class="form-group">
        <label for="editExpenseComments">Comments:</label>
        <input type="text" id="editExpenseComments" name="editExpenseComments" value='${transaction.comments}' >
      </div>
      </form>`
            //saveButton.onclick = editExpenseSave();
            const editbuttonClickHandler = () => {
                editExpenseSave(transaction.id);
            };
            saveButton.addEventListener('click', editbuttonClickHandler);
            break;

        case "deleteExpenseModalContent":
            const deletebuttonClickHandler = () => {
                deleteExpenseSave(transaction.id);
            };
            saveButton.addEventListener('click', deletebuttonClickHandler);
            modalContent.innerHTML = `<p style="color: red;">Are you sure ? Think again</p>`;
            break;

        case "filterExpenseModalContent":
            source_options = `<option value="">-------------</option>`
            sourcesList.forEach(function (source) {
                if (source.is_active) {

                    source_options += `
                    <option value="${source.id}">${source.name}</option>`;
                }
            })

            commodity_options = `<option value="">-------------</option>`;
            commoditiesList.forEach(function (commodity) {
                commodity_options += `
            <option value="${commodity.id}">${commodity.name}</option>`;
            })
            modalContent.innerHTML = `
                <form>
                    <div class="form-group">
                        <label for="filterTransactionType">Transaction Type:</label>
                        <select name="filterTransactionType" id="filterTransactionType">
                            <option value="">-------------</option>
                            <option value="credit">credit</option>
                            <option value="debit">debit</option>
                        </select>
                    </div>
    
                    <div class="form-group">
                        <label for="filterMonthAndYear">Date:</label>
                        <input type="month" id="filterMonthAndYear" name="filterMonthAndYear" max='${maxDate}' >
                    </div>
    
                    <div class="form-group">
                        <label for="filterSource">Source:</label>
                        <select class="form-control" id="filterSource" name="filterSource">
                        `+ source_options + `
                        </select>
                    </div>
    
                    <div class="form-group">
                        <label for="filterCommodity">Commodity:</label>
                        <select class="form-control" id="filterCommodity" name="filterCommodity">
                        `+ commodity_options + `
                        </select>
                    </div>
                </form>`

            let filterExpenseSubmitbuttonClickHandler = () => {
                filterExpenseSubmitSave();
            };
            saveButton.addEventListener('click', filterExpenseSubmitbuttonClickHandler);
            break;


        case "addSourceModalContent":
            var default_input = `<input type="radio" name="addSourceDefault" value=true > Yes
            <input type="radio" name="addSourceDefault"  value=false checked> No`
            modalContent.innerHTML = `
      <form>
        <div class="form-group">
          <label for="addSource">Source name :</label>
          <input type="text" id="addSource" name="addSource" >
        </div>

        <div class="form-group">
                <label for="addSourceDefault">Default :</label>`+
                default_input
                + `
            </div>
      </form>`
            saveButton.addEventListener('click', addSourceSave);
            break;

        case "editSourceModalContent":

            var default_input = `<input type="radio" name="editSourceDefault" value=true > Yes
            <input type="radio" name="editSourceDefault"  value=false checked> No`
            if (sources[index].default == true) {
                default_input = `<input type="radio" name="editSourceDefault" value=true checked> Yes
                <input type="radio" name="editSourceDefault"  value=false > No`
            }

            var is_active_input = `<input type="radio" name="editSourceActive" value=true > Yes
            <input type="radio" name="editSourceActive"  value=false checked> No`

            if (sources[index].is_active == true) {
                default_input = `<input type="radio" name="editSourceDefault" value=true checked> Yes
                <input type="radio" name="editSourceDefault"  value=false > No`
            }
            modalContent.innerHTML = `
          <form>
            <div class="form-group">
              <label for="editSource">Source name :</label>
              <input type="text" id="editSource" name="editSource" value="${sources[index].name}" >
            </div>

            <div class="form-group">
                <label for="editSourceDefault">Default :</label>`+
                default_input
                +
                `</div>
            <div class="form-group">
            <label for="editSourceActive">Active :</label>` +
                is_active_input
                +
                `
            </div>
          </form>`
            let editSourcebuttonClickHandler = () => {
                editSourceSave(sources[index].id);
            };
            saveButton.addEventListener('click', editSourcebuttonClickHandler);

            break;

        case "deleteSourceModalContent":
            modalContent.innerHTML = `<p style="color: red;">Are you sure ? Think again</p>`;
            let deleteSourcebuttonClickHandler = () => {
                deleteSourceSave(sources[index].id);
            };
            saveButton.addEventListener('click', deleteSourcebuttonClickHandler);

            break;


        case "addCommodityModalContent":
            modalContent.innerHTML = `
      <form>
        <div class="form-group">
          <label for="addCommodity">Commodity name :</label>
          <input type="text" id="addCommodity" name="addCommodity" >
        </div>
      </form>`
            saveButton.addEventListener('click', addCommoditySave);
            break;

        case "editCommodityModalContent":
            modalContent.innerHTML = `
      <form>
        <div class="form-group">
          <label for="editCommodity">Source name :</label>
          <input type="text" id="editCommodity" name="editCommodity" value="${commodities[index].name}" >
        </div>
      </form>`
            let editCommoditybuttonClickHandler = () => {
                editCommoditySave(commodities[index].id);
            };
            saveButton.addEventListener('click', editCommoditybuttonClickHandler);

            break;

        case "deleteCommodityModalContent":
            modalContent.innerHTML = `<p style="color: red;">Are you sure ? Think again</p>`;
            let deleteCommoditybuttonClickHandler = () => {
                deleteCommoditySave(sources[index].id);
            };
            saveButton.addEventListener('click', deleteCommoditybuttonClickHandler);

            break;


        case "addBalanceModalContent":
            source_options = ``
            sourcesList.forEach(function (source) {
                if (source.is_active) {
                    source_options += `
                    <option value="${source.id}">${source.name}</option>`;
                }
            })
            modalContent.innerHTML = `
          <form>
            <div class="form-group">
                <label for="addBalanceMonthAndYear">Date:</label>
                <input type="month" id="addBalanceMonthAndYear" name="addBalanceMonthAndYear" max='${maxDate}' value='${maxDate}'>
            </div>
    
            <div class="form-group">
                <label for="addBalanceSource">Source:</label>
                <select class="form-control" id="addBalanceSource" name="addBalanceSource">
                `+ source_options + `
                </select>
            </div>
    
            <div class="form-group">
                <label for="addBalanceFirstDayAmount">First Day Amount:</label>
                <input type="number"  class="form-control" id="addBalanceFirstDayAmount" name="addBalanceFirstDayAmount">
            </div>

            <div class="form-group">
                <label for="addBalanceLastDayAmount">Last Day Amount:</label>
                <input type="number"  class="form-control" id="addBalanceLastDayAmount" name="addBalanceLastDayAmount">
            </div>
          </form>`
            saveButton.addEventListener('click', addBlanaceSave);
            break;

        case "editBalanceModalContent":
            let balance = balancesList[index];
            source_options = ``
            sourcesList.forEach(function (source) {
                if (source.is_active) {
                    if (source.id == balance.source.id) {
                        source_options += `
      <option value="${source.id}" selected >${source.name}</option>`;
                    } else {
                        source_options += `
            <option value="${source.id}">${source.name}</option>`;
                    }
                }
            });

            yearAndMonth = balance.year + "-" + balance.month;
            lastDayAmt = balance.last_day_amount;
            if (lastDayAmt == null) {
                lastDayAmt = '';
            }
            modalContent.innerHTML = `
              <form>
                <div class="form-group">
                    <label for="editBalanceMonthAndYear">Date:</label>
                    <input type="month" id="editBalanceMonthAndYear" name="editBalanceMonthAndYear" value="${yearAndMonth}" max='${maxDate}'>
                </div>
        
                <div class="form-group">
                    <label for="editBalanceSource">Source:</label>
                    <select class="form-control" id="editBalanceSource" name="editBalanceSource">
                    `+ source_options + `
                    </select>
                </div>
        
                <div class="form-group">
                    <label for="editBalanceFirstDayAmount">First Day Amount:</label>
                    <input type="number"  class="form-control" id="editBalanceFirstDayAmount" name="editBalanceFirstDayAmount" value="${balance.first_day_amount}">
                </div>
    
                <div class="form-group">
                    <label for="editBalanceLastDayAmount">Last Day Amount:</label>
                    <input type="number"  class="form-control" id="editBalanceLastDayAmount" name="editBalanceLastDayAmount" value="${lastDayAmt}">
                </div>
              </form>`
            let editBalancebuttonClickHandler = () => {
                editBalanceSave(balance.id);
            };
            saveButton.addEventListener('click', editBalancebuttonClickHandler);

            break;

        case "deleteBalanceModalContent":
            modalContent.innerHTML = `<p style="color: red;">Are you sure ? Think again</p>`;
            let deleteBalancebuttonClickHandler = () => {
                deleteBalanceSave(balancesList[index].id);
            };
            saveButton.addEventListener('click', deleteBalancebuttonClickHandler);

            break;

        case "filterBalanceModalContent":
            source_options = `<option value="">-------------</option>`
            sourcesList.forEach(function (source) {
                if (source.is_active) {

                    source_options += `
                    <option value="${source.id}">${source.name}</option>`;
                }
            })

            modalContent.innerHTML = `
            <form>
                
                <div class="form-group">
                    <label for="filterBalanceMonth">Select a Month:</label>
                    <select id="filterBalanceMonth" name="filterBalanceMonth">
                        <option value="">-------------</option>
                        <option value="01">January</option>
                        <option value="02">February</option>
                        <option value="03">March</option>
                        <option value="04">April</option>
                        <option value="05">May</option>
                        <option value="06">June</option>
                        <option value="07">July</option>
                        <option value="08">August</option>
                        <option value="09">September</option>
                        <option value="10">October</option>
                        <option value="11">November</option>
                        <option value="12">December</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="filterBalanceYear">Select a year:</label>
                    <select id="filterBalanceYear" name="filterBalanceYear">
                    `+ yearOptions + `
                    </select>
                </div>
                <div class="form-group">
                    <label for="filterBalanceSource">Source:</label>
                    <select class="form-control" id="filterBalanceSource" name="filterBalanceSource">
                    `+ source_options + `
                    </select>
                </div>

            </form>`

            let filterBalanceSubmitbuttonClickHandler = () => {
                filterBalanceSubmitSave();
            };
            saveButton.addEventListener('click', filterBalanceSubmitbuttonClickHandler);
            break;


        case "addInternalTransactionModalContent":
            source_options = ``
            sourcesList.forEach(function (source) {
                if (source.is_active) {
                    if (source.default == true) {
                        source_options += `
                        <option value="${source.id}" selected>${source.name}</option>`;
                    }
                    else {

                        source_options += `
                        <option value="${source.id}">${source.name}</option>`;
                    }
                }
            })

            modalContent.innerHTML = `
      <form>
        <div class="form-group">
        <label for="addInternalTransactionDate">Date:</label>
        <input type="datetime-local" id="addInternalTransactionDate" name="addInternalTransactionDate">
        </div>

        <div class="form-group">
        <label for="addInternalTransactionFrom">From:</label>
        <select class="form-control" id="addInternalTransactionFrom" name="addInternalTransactionFrom">
          `+ source_options + `
        </select>
        </div>

        <div class="form-group">
        <label for="addInternalTransactionTo">To:</label>
        <select class="form-control" id="addInternalTransactionTo" name="addInternalTransactionTo">
          `+ source_options + `
        </select>
        </div>

        <div class="form-group">
            <label for="addInternalTransactionAmount">Amount:</label>
            <input type="number" id="addInternalTransactionAmount" name="addInternalTransactionAmount"  >
        </div>

        <div class="form-group">
            <label for="addInternalTransactionComments">Comments:</label>
            <input type="text" id="addInternalTransactionComments" name="addInternalTransactionComments"  >
        </div>
        </form>`

            saveButton.addEventListener('click', addInternalTransactionSave);
            var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
            var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -5);
            document.getElementById('addInternalTransactionDate').value = localISOTime;
            break;

        case "editInternalTransactionModalContent":
            transaction = internalTransactionsData[index];

            from_options = ``
            sourcesList.forEach(function (source) {
                if (source.is_active) {
                    if (source.id == transaction.source.id) {
                        from_options += `
                        <option value="${source.id}" selected >${source.name}</option>`;
                    } else {
                        from_options += `
                        <option value="${source.id}">${source.name}</option>`;
                    }
                }
            });

            to_options = ``
            sourcesList.forEach(function (dest) {
                if (dest.is_active) {
                    if (dest.id == transaction.destination.id) {
                        to_options += `
      <option value="${dest.id}" selected >${dest.name}</option>`;
                    } else {
                        to_options += `
            <option value="${dest.id}">${dest.name}</option>`;
                    }
                }
            });
            modalContent.innerHTML = `
            <form>
              <div class="form-group">
              <label for="editInternalTransactionDate">Date:</label>
              <input type="datetime-local" id="editInternalTransactionDate" name="editInternalTransactionDate" value="${transaction.date}">
              </div>
      
              <div class="form-group">
              <label for="editInternalTransactionFrom">From:</label>
              <select class="form-control" id="editInternalTransactionFrom" name="editInternalTransactionFrom">
                `+ from_options + `
              </select>
              </div>
      
              <div class="form-group">
              <label for="editInternalTransactionTo">To:</label>
              <select class="form-control" id="editInternalTransactionTo" name="editInternalTransactionTo">
                `+ to_options + `
              </select>
              </div>
      
              <div class="form-group">
                  <label for="editInternalTransactionAmount">Amount:</label>
                  <input type="number" id="editInternalTransactionAmount" name="editInternalTransactionAmount" value='${transaction.amount}' >
              </div>
      
              <div class="form-group">
                  <label for="editInternalTransactionComments">Comments:</label>
                  <input type="text" id="editInternalTransactionComments" name="editInternalTransactionComments" value='${transaction.comments}' >
              </div>
              </form>`

            const editInternalTransactionClickHandler = () => {
                editInternalTransactionSave(transaction.id);
            };
            saveButton.addEventListener('click', editInternalTransactionClickHandler);
            break;

        case "deleteInternalTransactionModalContent":
            transaction = internalTransactionsData[index];
            const deleteInternalTransactionClickHandler = () => {
                deleteInternalTransactionSave(transaction.id);
            };
            saveButton.addEventListener('click', deleteInternalTransactionClickHandler);
            modalContent.innerHTML = `<p style="color: red;">Are you sure ? Think again</p>`;
            break;

        case "filterInternalTransactionModalContent":
            from_options = `<option value="">-------------</option>`
            sourcesList.forEach(function (source) {
                if (source.is_active) {
                    from_options += `
                    <option value="${source.id}">${source.name}</option>`;
                }
            }
            );

            to_options = `<option value="">-------------</option>`
            sourcesList.forEach(function (dest) {
                if (dest.is_active) {
                    to_options += `
                    <option value="${dest.id}">${dest.name}</option>`;
                }
            });
            modalContent.innerHTML = `
            <form>
              <div class="form-group">
              <label for="filterInternalTransactionDate">Date:</label>
              <input type="month" id="filterInternalTransactionDate" name="filterInternalTransactionDate" >
              </div>
      
              <div class="form-group">
              <label for="filterInternalTransactionFrom">From:</label>
              <select class="form-control" id="filterInternalTransactionFrom" name="filterInternalTransactionFrom">
                `+ from_options + `
              </select>
              </div>
      
              <div class="form-group">
              <label for="filterInternalTransactionTo">To:</label>
              <select class="form-control" id="filterInternalTransactionTo" name="filterInternalTransactionTo">
                `+ to_options + `
              </select>
              </div>  
              </form>`

            const filterInternalTransactionClickHandler = () => {
                filterInternalTransactionSubmitSave(transaction.id);
            };
            saveButton.addEventListener('click', filterInternalTransactionClickHandler);
            break;

        default:
            // Code to be executed if none of the cases match
            modalContent.innerHTML = `
        <p>Invalid!!</p>
        `
    }
}


function closeModal() {
    const modal = document.getElementById('Modal');
    modal.style.display = 'none';
    var modalBody = document.querySelector('.modal-body');
    // Access each child div one by one
    for (var i = 0; i < modalBody.children.length; i++) {
        var childDiv = modalBody.children[i];

        // Do something with the child div (e.g., log its ID)
        childDiv.innerHTML = '';
    }
}

function customRemoveEventListeners(element) {
    // Clone the button
    var newElement = element.cloneNode(true);
    // Replace the button with its clone
    element.parentNode.replaceChild(newElement, element);

    return newElement;
}

function updateButtonStates(previousUrl, nextUrl) {
    let prevButton = document.getElementById("prev-btn");
    let nextButton = document.getElementById("next-btn");

    function previousButtonClickHandler() {
        fetch_expense_data(previousUrl);
    }

    function nextButtonClickHandler() {
        fetch_expense_data(nextUrl);
    }

    if (previousUrl != null) {
        prevButton = customRemoveEventListeners(prevButton);
        prevButton.addEventListener('click', previousButtonClickHandler);
        prevButton.disabled = false;
    } else {
        prevButton = customRemoveEventListeners(prevButton);
        prevButton.disabled = true;
    }



    if (nextUrl != null) {
        nextButton = customRemoveEventListeners(nextButton);
        nextButton.addEventListener('click', nextButtonClickHandler);
        nextButton.disabled = false;
    } else {

        nextButton = customRemoveEventListeners(nextButton);
        nextButton.disabled = true;
    }




}

async function fetch_expense_data(url = "https://priyanshuarora.pythonanywhere.com/api/expenses/") {
    last_req_url = url;
    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Token ${userToken}`
            }
        });
        const data = await response.json();

        if (response.status == 200) {
            updateButtonStates(data.previous, data.next);
            populateTransactionTable(data.results);
            expense_data = data.results;

        }
        else if (response.status == 401) {
            login_redirect();
        }
        else {
            document.getElementById("message").style.color = 'red';
            document.getElementById('message').textContent = "error";
            setTimeout(function () {
                document.getElementById('message').textContent = '';
            }, 1500);
        }
    }
    catch (error) {
        document.getElementById("message").style.color = 'red';
        document.getElementById("message").textContent =
            "An error occurred during fetching data. " + `${error}`;
        setTimeout(function () {
            document.getElementById('message').textContent = '';
        }, 1500);
    };
}

function populateTransactionTable(transactions) {
    const tableBody = document.querySelector('#transactionTable tbody');
    tableBody.innerHTML = '';

    transactions.forEach((transaction, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
      <td>${transaction.date}</td>
      <td>${transaction.source.name}</td>
      <td>${transaction.transaction_type}</td>
      <td>${transaction.amount}</td>
      <td>${transaction.commodity.name}</td>
      <td>${transaction.comments}</td>
      <td><a class="icon-link edit-icon" title="Edit"  onclick=openModal('editExpenseModalContent',${index})><i class="fas fa-edit"></i></a></td>
      <td><a class="icon-link delete-icon" title="Delete"  onclick=openModal('deleteExpenseModalContent',${index})><i class="fas fa-trash-alt"></i></a></td> 
      `;
        tableBody.appendChild(row);
    });
}



async function fetch_sources(url = "https://priyanshuarora.pythonanywhere.com/api/expenses/sources/") {
    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Token ${userToken}`
            }
        })
        if (response.status == 200) {
            const data = await response.json();
            sourcesList = data;

            return data;
        }
        else if (response.status == 401) {
            login_redirect();
        }
        else {
            const data = await response.json();
            document.getElementById("message").style.color = 'red';
            document.getElementById('message').textContent = data[(Object.keys(data))[0]];
            setTimeout(function () {
                document.getElementById('message').textContent = '';
            }, 1500);
        }
    } catch (error) {
        document.getElementById("message").style.color = 'red';
        document.getElementById("message").textContent =
            "An error occurred during fetching data. " + `${error}`;
        setTimeout(function () {
            document.getElementById('message').textContent = '';
        }, 1500);
    }
}

async function load_sources() {
    sourcesList = await fetch_sources();
    const tableBody = document.querySelector('#SourcesTable tbody');
    tableBody.innerHTML = '';

    sourcesList.forEach((source, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${source.name}</td>
          <td><a class="icon-link edit-icon" title="Edit"  onclick=openModal('editSourceModalContent',${index},sources=sourcesList)><i class="fas fa-edit"></i></a></td>
          <td><a class="icon-link delete-icon" title="Delete"  onclick=openModal('deleteSourceModalContent',${index},sources=sourcesList)><i class="fas fa-trash-alt"></i></a></td> 
          `;
        tableBody.appendChild(row);
    });
}

function addSourceSave() {
    const source_name = document.getElementById("addSource").value;
    const is_source_default = document.querySelector('input[name="addSourceDefault"]:checked').value;
    if (source_name == '') {
        document.getElementById("modal-message").style.color = 'red';
        document.getElementById("modal-message").textContent =
            "name cant be blank";
        setTimeout(function () {
            document.getElementById('modal-message').textContent = '';
        }, 1500);
    }
    else {
        fetch("https://priyanshuarora.pythonanywhere.com/api/expenses/sources/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Token ${userToken}`
            },
            body: JSON.stringify({
                name: source_name,
                default: is_source_default
            })
        }).then((response) => response.json()).then((data) => {
            if (data.id) {
                document.getElementById("modal-message").style.color = 'green';
                document.getElementById("modal-message").textContent = 'Success!!';
            } else {
                document.getElementById("modal-message").style.color = 'red';
                document.getElementById("modal-message").textContent = data[(Object.keys(data))[0]];
            }
            setTimeout(function () {
                document.getElementById('modal-message').textContent = '';
                fetch_sources();
                load_sources();
                closeModal();
            }, 1500);
        }).catch((error) => {
            document.getElementById("modal-message").style.color = 'red';
            document.getElementById("modal-message").textContent =
                "An error occurred during fetching data. " + `${error}`;
            setTimeout(function () {
                document.getElementById('modal-message').textContent = '';
            }, 1500);
        });
    }
};

function editSourceSave(id) {
    const source_name = document.getElementById("editSource").value;
    const is_source_default = document.querySelector('input[name="editSourceDefault"]:checked').value;
    const is_active = document.querySelector('input[name="editSourceActive"]:checked').value;
    if (source_name == '') {
        document.getElementById("modal-message").style.color = 'red';
        document.getElementById("modal-message").textContent =
            "name cant be blank";
        setTimeout(function () {
            document.getElementById('modal-message').textContent = '';
        }, 1500);
    }
    else {
        fetch(`https://priyanshuarora.pythonanywhere.com/api/expenses/sources/${id}/`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Token ${userToken}`
            },
            body: JSON.stringify({
                name: source_name,
                default: is_source_default,
                is_active: is_active
            })
        }).then((response) => response.json()).then((data) => {
            if (data.id) {
                document.getElementById("modal-message").style.color = 'green';
                document.getElementById("modal-message").textContent = 'Success!!';
            } else {
                document.getElementById("modal-message").style.color = 'red';
                document.getElementById("modal-message").textContent = data[(Object.keys(data))[0]];
            }
            setTimeout(function () {
                document.getElementById('modal-message').textContent = '';
                fetch_sources();
                load_sources();
                closeModal();
            }, 1500);
        }).catch((error) => {
            document.getElementById("modal-message").style.color = 'red';
            document.getElementById("modal-message").textContent =
                "An error occurred during fetching data. " + `${error}`;
            setTimeout(function () {
                document.getElementById('modal-message').textContent = '';
            }, 1500);
        });
    }
};

function deleteSourceSave(id) {
    fetch(`https://priyanshuarora.pythonanywhere.com/api/expenses/sources/${id}/`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Token ${userToken}`
        }
    }).then((data) => {
        if (data.status == 204) {
            document.getElementById("modal-message").style.color = 'green';
            document.getElementById("modal-message").textContent = 'Success!!';

        } else {
            data = data.json();
            document.getElementById("modal-message").style.color = 'red';
            document.getElementById("modal-message").textContent = data[(Object.keys(data))[0]];
        }
        setTimeout(function () {
            document.getElementById('modal-message').textContent = '';
            fetch_sources();
            load_sources();
            closeModal();
        }, 1500);
    }).catch((error) => {
        document.getElementById("modal-message").style.color = 'red';
        document.getElementById("modal-message").textContent =
            "An error occurred during fetching data. " + `${error}`;
        setTimeout(function () {
            document.getElementById('modal-message').textContent = '';
        }, 1500);
    });
};


async function fetch_commodities() {
    try {
        const response = await fetch("https://priyanshuarora.pythonanywhere.com/api/expenses/commodities/", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Token ${userToken}`
            }
        });

        if (response.status == 200) {
            const data = await response.json();
            commoditiesList = data;
            return data;
        }
        else if (response.status == 401) {
            login_redirect();
        }
        else {
            const data = await response.json();
            document.getElementById("message").style.color = 'red';
            document.getElementById("message").textContent =
                "An error occurred during fetching data. ";
            setTimeout(function () {
                document.getElementById('message').textContent = '';
            }, 1500);
        }
    } catch (error) {
        document.getElementById("message").style.color = 'red';
        document.getElementById("message").textContent =
            "An error occurred during fetching data. " + `${error}`;
        setTimeout(function () {
            document.getElementById('message').textContent = '';
        }, 1500);
    }

}

async function load_commodities() {
    commoditiesList = await fetch_commodities(userToken = userToken);
    const tableBody = document.querySelector('#CommodityTable tbody');
    tableBody.innerHTML = '';

    commoditiesList.forEach((commodity, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${commodity.name}</td>
          <td><a class="icon-link edit-icon" title="Edit"  onclick=openModal('editCommodityModalContent',${index},commodities=commoditiesList)><i class="fas fa-edit"></i></a></td>
          <td><a class="icon-link delete-icon" title="Delete"  onclick=openModal('deleteCommodityModalContent',${index},commodities=commoditiesList)><i class="fas fa-trash-alt"></i></a></td> 
          `;
        tableBody.appendChild(row);
    });
}

function addCommoditySave() {
    const commodity_name = document.getElementById("addCommodity").value;
    if (commodity_name == '') {
        document.getElementById("modal-message").style.color = 'red';
        document.getElementById("modal-message").textContent =
            "name cant be blank";
        setTimeout(function () {
            document.getElementById('modal-message').textContent = '';
        }, 1500);
    }
    else {
        fetch("https://priyanshuarora.pythonanywhere.com/api/expenses/commodities/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Token ${userToken}`
            },
            body: JSON.stringify({
                name: commodity_name,
            })
        }).then((response) => response.json()).then((data) => {
            if (data.id) {
                document.getElementById("modal-message").style.color = 'green';
                document.getElementById("modal-message").textContent = 'Success!!';
            } else {
                document.getElementById("modal-message").style.color = 'red';
                document.getElementById("modal-message").textContent = data[(Object.keys(data))[0]];
            }
            setTimeout(function () {
                document.getElementById('modal-message').textContent = '';
                fetch_commodities();
                load_commodities();
                closeModal();
            }, 1500);
        }).catch((error) => {
            document.getElementById("modal-message").style.color = 'red';
            document.getElementById("modal-message").textContent =
                "An error occurred during fetching data. " + `${error}`;
            setTimeout(function () {
                document.getElementById('modal-message').textContent = '';
            }, 1500);
        });
    }
};

function editCommoditySave(id) {
    const commodity_name = document.getElementById("editCommodity").value;
    if (commodity_name == '') {
        document.getElementById("modal-message").style.color = 'red';
        document.getElementById("modal-message").textContent =
            "name cant be blank";
        setTimeout(function () {
            document.getElementById('modal-message').textContent = '';
        }, 1500);
    }
    else {
        fetch(`https://priyanshuarora.pythonanywhere.com/api/expenses/commodities/${id}/`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Token ${userToken}`
            },
            body: JSON.stringify({
                name: commodity_name,
            })
        }).then((response) => response.json()).then((data) => {
            if (data.id) {
                document.getElementById("modal-message").style.color = 'green';
                document.getElementById("modal-message").textContent = 'Success!!';
            } else {
                document.getElementById("modal-message").style.color = 'red';
                document.getElementById("modal-message").textContent = data[(Object.keys(data))[0]];
            }
            setTimeout(function () {
                document.getElementById('modal-message').textContent = '';
                fetch_commodities();
                load_commodities();
                closeModal();
            }, 1500);
        }).catch((error) => {
            document.getElementById("modal-message").style.color = 'red';
            document.getElementById("modal-message").textContent =
                "An error occurred during fetching data. " + `${error}`;
            setTimeout(function () {
                document.getElementById('modal-message').textContent = '';
            }, 1500);
        });
    }
};

function deleteCommoditySave(id) {
    fetch(`https://priyanshuarora.pythonanywhere.com/api/expenses/commodities/${id}/`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Token ${userToken}`
        }
    }).then((data) => {
        if (data.status == 204) {
            document.getElementById("modal-message").style.color = 'green';
            document.getElementById("modal-message").textContent = 'Success!!';
        } else {
            data = data.json();
            document.getElementById("modal-message").style.color = 'red';
            document.getElementById("modal-message").textContent = data[(Object.keys(data))[0]];
        }
        setTimeout(function () {
            document.getElementById('modal-message').textContent = '';
            fetch_commodities();
            load_commodities();
            closeModal();
        }, 1500);
    }).catch((error) => {
        document.getElementById("modal-message").style.color = 'red';
        document.getElementById("modal-message").textContent =
            "An error occurred during fetching data. " + `${error}`;
        setTimeout(function () {
            document.getElementById('modal-message').textContent = '';
        }, 1500);
    });
};

function addExpenseSave() {
    if (document.getElementById("addExpenseCommodity").value != "" &&
        document.getElementById("addExpenseAmount").value != "" &&
        document.getElementById("addExpenseComments").value != "") {
        fetch("https://priyanshuarora.pythonanywhere.com/api/expenses/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Token ${userToken}`
            },
            body: JSON.stringify({
                date: document.getElementById("addExpenseDate").value,
                source: document.getElementById("addExpenseSource").value,
                transaction_type: document.getElementById("addExpenseType").value,
                amount: document.getElementById("addExpenseAmount").value,
                commodity: document.getElementById("addExpenseCommodity").value,
                comments: document.getElementById("addExpenseComments").value
            })
        }).then((response) => response.json()).then((data) => {
            if (data.id) {
                document.getElementById("modal-message").style.color = 'green';
                document.getElementById("modal-message").textContent = 'Success!!';
            } else {
                document.getElementById("modal-message").style.color = 'red';
                document.getElementById("modal-message").textContent = data[(Object.keys(data))[0]];
            }
            setTimeout(function () {
                document.getElementById('modal-message').textContent = '';
                fetch_expense_data();
                closeModal();
            }, 1500);
        }).catch((error) => {
            document.getElementById("modal-message").style.color = 'red';
            document.getElementById("modal-message").textContent =
                "An error occurred during fetching data. " + `${error}`;
            setTimeout(function () {
                document.getElementById('modal-message').textContent = '';
            }, 1500);
        });
    }
    else {
        if (document.getElementById("addExpenseCommodity").value == "") {
            document.getElementById("modal-message").style.color = 'red';
            document.getElementById("modal-message").textContent = "Commodity value can't be blank";
        }
        if (document.getElementById("addExpenseAmount").value == "") {
            document.getElementById("modal-message").style.color = 'red';
            document.getElementById("modal-message").textContent = "Commodity value can't be blank";
        }
        if (document.getElementById("addExpenseComments").value == "") {
            document.getElementById("modal-message").style.color = 'red';
            document.getElementById("modal-message").textContent = "Commodity value can't be blank";
        }
    }

};

function editExpenseSave(id) {
    fetch(`https://priyanshuarora.pythonanywhere.com/api/expenses/${id}/`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Token ${userToken}`
        },
        body: JSON.stringify({
            date: document.getElementById("editExpenseDate").value,
            source: document.getElementById("editExpenseSource").value,
            transaction_type: document.getElementById("editExpenseType").value,
            amount: document.getElementById("editExpenseAmount").value,
            commodity: document.getElementById("editExpenseCommodity").value,
            comments: document.getElementById("editExpenseComments").value
        })
    }).then((response) => response.json()).then((data) => {
        if (data.id) {
            document.getElementById("modal-message").style.color = 'green';
            document.getElementById("modal-message").textContent = 'Success!!';
        } else {
            document.getElementById("modal-message").style.color = 'red';
            document.getElementById("modal-message").textContent = data[(Object.keys(data))[0]];
        }
        setTimeout(function () {
            document.getElementById('modal-message').textContent = '';
            fetch_expense_data();
            closeModal();
        }, 1500);
    }).catch((error) => {
        document.getElementById("modal-message").style.color = 'red';
        document.getElementById("modal-message").textContent =
            "An error occurred during fetching data. " + `${error}`;
        setTimeout(function () {
            document.getElementById('modal-message').textContent = '';
        }, 1500);
    });
};

function deleteExpenseSave(id) {
    fetch(`https://priyanshuarora.pythonanywhere.com/api/expenses/${id}/`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Token ${userToken}`
        }
    }).then((data) => {
        if (data.status == 204) {
            document.getElementById("modal-message").style.color = 'green';
            document.getElementById("modal-message").textContent = 'Success!!';
        } else {
            data = data.json();
            document.getElementById("modal-message").style.color = 'red';
            document.getElementById("modal-message").textContent = data[(Object.keys(data))[0]];
        }
        setTimeout(function () {
            document.getElementById('modal-message').textContent = '';
            fetch_expense_data();
            closeModal();
        }, 1500);
    }).catch((error) => {
        document.getElementById("modal-message").style.color = 'red';
        document.getElementById("modal-message").textContent =
            "An error occurred during fetching data. " + `${error}`;
        setTimeout(function () {
            document.getElementById('modal-message').textContent = '';
        }, 1500);
    });
}

function filterExpenseSubmitSave() {
    var clearFilterBtn = document.getElementById("clear-filter-btn");
    clearFilterBtn = customRemoveEventListeners(clearFilterBtn);
    var commodity = document.getElementById("filterCommodity").value;
    var transaction_type = document.getElementById("filterTransactionType").value;
    var source = document.getElementById("filterSource").value;
    var date = document.getElementById("filterMonthAndYear").value;
    url = `https://priyanshuarora.pythonanywhere.com/api/expenses/?commodity=${commodity}&transaction_type=${transaction_type}&date=${date}&source=${source}`;
    fetch_expense_data(url);
    closeModal();
    clearFilterBtn.disabled = false;
    clearFilterBtn.addEventListener("click", function () {
        fetch_expense_data();
        clearFilterBtn.disabled = true;
    });

}



async function fetch_balance_data(url = "https://priyanshuarora.pythonanywhere.com/api/balances/") {
    last_req_url = url;
    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Token ${userToken}`
            }
        });
        if (response.status == 200) {
            const data = await response.json();
            updateButtonStates(data.previous, data.next);
            populateBalanceTable(data.results);
            balancesList = data.results;
            return balancesList;

        }
        else if (response.status == 401) {
            login_redirect();
        }
        else {
            document.getElementById("message").style.color = 'red';
            document.getElementById('message').textContent = "error";
            setTimeout(function () {
                document.getElementById('message').textContent = '';
            }, 1500);
        }
    } catch (error) {

        document.getElementById("message").style.color = 'red';
        document.getElementById("message").textContent =
            "An error occurred during fetching data. " + `${error}`;
        setTimeout(function () {
            document.getElementById('message').textContent = '';
        }, 1500);
    }
}

function populateBalanceTable(balances_data) {
    const tableBody = document.querySelector('#balanceTable tbody');
    tableBody.innerHTML = '';

    balances_data.forEach((transaction, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
      <td>${transaction.year}</td>
      <td>${transaction.month}</td>
      <td>${transaction.source.name}</td>
      <td>${transaction.first_day_amount}</td>
      <td>${transaction.last_day_amount}</td>

      <td><a class="icon-link edit-icon" title="Edit"  onclick=openModal('editBalanceModalContent',${index})><i class="fas fa-edit"></i></a></td>
      <td><a class="icon-link delete-icon" title="Delete"  onclick=openModal('deleteBalanceModalContent',${index})><i class="fas fa-trash-alt"></i></a></td>
      <td><a class="icon-link detail-icon" title="Details"   href='balanceDetails.html?id=${transaction.id}' target='_blank')><i class="fas fa-info-circle"></i></a></td> 
      `;
        tableBody.appendChild(row);
    });
}

function addBlanaceSave() {
    yearAndMonth = document.getElementById("addBalanceMonthAndYear").value;
    year = yearAndMonth.split("-")[0];
    month = yearAndMonth.split("-")[1];

    lastDayAmount = document.getElementById("addBalanceLastDayAmount").value
    if (lastDayAmount == '') {
        lastDayAmount = null;
    }
    if (year == '' || month == '') {
        document.getElementById("modal-message").style.color = 'red';
        document.getElementById("modal-message").textContent = "month or year can't be blank!";
        setTimeout(function () {
            document.getElementById('modal-message').textContent = '';
        }, 1500);
    } else {
        fetch("https://priyanshuarora.pythonanywhere.com/api/balances/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Token ${userToken}`
            },
            body: JSON.stringify({
                year: year,
                month: month,
                source: document.getElementById("addBalanceSource").value,
                first_day_amount: document.getElementById("addBalanceFirstDayAmount").value,
                last_day_amount: lastDayAmount,
            })
        }).then((response) => response.json()).then((data) => {
            if (data.id) {
                document.getElementById("modal-message").style.color = 'green';
                document.getElementById("modal-message").textContent = 'Success!!';
                setTimeout(function () {
                    document.getElementById('modal-message').textContent = '';
                    fetch_balance_data();
                }, 1500);
            } else {
                document.getElementById("modal-message").style.color = 'red';
                document.getElementById("modal-message").textContent = data[(Object.keys(data))[0]];
                setTimeout(function () {
                    document.getElementById('modal-message').textContent = '';
                    fetch_balance_data();
                    closeModal();
                }, 1500);
            }

        }).catch((error) => {
            document.getElementById("modal-message").style.color = 'red';
            document.getElementById("modal-message").textContent =
                "An error occurred during fetching data. " + `${error}`;
            setTimeout(function () {
                document.getElementById('modal-message').textContent = '';
            }, 1500);
        });
    }

};

function editBalanceSave(id) {
    yearAndMonth = document.getElementById("editBalanceMonthAndYear").value;
    year = yearAndMonth.split("-")[0];
    month = yearAndMonth.split("-")[1];

    lastDayAmount = document.getElementById("editBalanceLastDayAmount").value
    if (lastDayAmount == '') {
        lastDayAmount = null;
    }
    if (year == '' || month == '') {
        document.getElementById("modal-message").style.color = 'red';
        document.getElementById("modal-message").textContent = "month or year can't be blank!";
        setTimeout(function () {
            document.getElementById('modal-message').textContent = '';
        }, 1500);
    }
    else {
        fetch(`https://priyanshuarora.pythonanywhere.com/api/balances/${id}/`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Token ${userToken}`
            },
            body: JSON.stringify({
                year: year,
                month: month,
                source: document.getElementById("editBalanceSource").value,
                first_day_amount: document.getElementById("editBalanceFirstDayAmount").value,
                last_day_amount: lastDayAmount,
            })
        }).then((response) => response.json()).then((data) => {
            if (data.id) {
                document.getElementById("modal-message").style.color = 'green';
                document.getElementById("modal-message").textContent = 'Success!!';
            } else {
                document.getElementById("modal-message").style.color = 'red';
                document.getElementById("modal-message").textContent = data[(Object.keys(data))[0]];
            }
            setTimeout(function () {
                document.getElementById('modal-message').textContent = '';
                fetch_balance_data();
                closeModal();
            }, 1500);
        }).catch((error) => {
            document.getElementById("modal-message").style.color = 'red';
            document.getElementById("modal-message").textContent =
                "An error occurred during fetching data. " + `${error}`;
            setTimeout(function () {
                document.getElementById('modal-message').textContent = '';
            }, 1500);
        });
    };
}

function deleteBalanceSave(id) {
    fetch(`https://priyanshuarora.pythonanywhere.com/api/balances/${id}/`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Token ${userToken}`
        }
    }).then((data) => {
        if (data.status == 204) {
            document.getElementById("modal-message").style.color = 'green';
            document.getElementById("modal-message").textContent = 'Success!!';
        } else {
            data = data.json();
            document.getElementById("modal-message").style.color = 'red';
            document.getElementById("modal-message").textContent = data[(Object.keys(data))[0]];
        }
        setTimeout(function () {
            document.getElementById('modal-message').textContent = '';
            fetch_balance_data();
            closeModal();
        }, 1500);
    }).catch((error) => {
        document.getElementById("modal-message").style.color = 'red';
        document.getElementById("modal-message").textContent =
            "An error occurred during fetching data. " + `${error}`;
        setTimeout(function () {
            document.getElementById('modal-message').textContent = '';
        }, 1500);
    });
}

function filterBalanceSubmitSave() {
    var clearFilterBtn = document.getElementById("clear-filter-btn");
    clearFilterBtn = customRemoveEventListeners(clearFilterBtn);
    var source = document.getElementById("filterBalanceSource").value;
    var year = document.getElementById("filterBalanceYear").value;
    var month = document.getElementById("filterBalanceMonth").value;
    url = `https://priyanshuarora.pythonanywhere.com/api/balances/?year=${year}&month=${month}&source=${source}`;
    fetch_balance_data(url);
    closeModal();
    clearFilterBtn.disabled = false;
    clearFilterBtn.addEventListener("click", function () {
        fetch_balance_data();
        clearFilterBtn.disabled = true;
    });

}


function logout() {
    if (check_user_logged_in() == true) {
        userToken = localStorage.getItem("userToken");
        fetch("https://priyanshuarora.pythonanywhere.com/api/logout/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Token ${userToken}`
            }
        }).then((response) => response.json()).then((data) => {
            if (data.success) {
                localStorage.removeItem('userToken');
                localStorage.removeItem('userID');
                localStorage.removeItem('userEmail');
                localStorage.removeItem('logged_in');
                window.location.href = "index.html";
            }
        }).catch((error) => {
            document.getElementById("message").style.color = 'red';
            document.getElementById('message').textContent = error;
            setTimeout(function () {
                document.getElementById('message').textContent = '';
            }, 1500);
        });
    }
}



async function fetch_balance_detail(id) {
    try {
        const response = await fetch(`https://priyanshuarora.pythonanywhere.com/api/balances/details/${id}/`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Token ${userToken}`
            }
        });
        if (response.status == 200) {
            const data = await response.json();
            populateBalanceDetails(data);
        }
        else if (response.status == 401) {
            login_redirect();
        }
        else {
            document.getElementById("message").style.color = 'red';
            document.getElementById('message').textContent = "error";
            setTimeout(function () {
                document.getElementById('message').textContent = '';
            }, 1500);
        }
    }
    catch (error) {
        console.log(error)
        document.getElementById("message").style.color = 'red';
        document.getElementById("message").textContent =
            "An error occurred during fetching data. " + `${error}`;
        setTimeout(function () {
            document.getElementById('message').textContent = '';
        }, 1500);
    }
}

function populateBalanceDetails(data) {
    const month = document.getElementById("month");
    const year = document.getElementById("year");
    const initial = document.getElementById("initial");
    const remaining = document.getElementById("remaining");
    const total_credits = document.getElementById("total_credits");
    const total_debits = document.getElementById("total_debits");
    // const internal_transfers = document.getElementById("internal_transfers");


    month.innerHTML = data['month'];
    year.innerHTML = data['year'];
    initial.innerHTML = data['initial'];
    remaining.innerHTML = data['remaining'];
    total_credits.innerHTML = data['total_credits'];
    total_debits.innerHTML = data['total_debits'];
    // internal_transfers.innerHTML = data['internal_transfers'];


    const expenditure_table = document.querySelector("#expenditure_table tbody");
    expenditure_table.innerHTML = '';

    const expenditure_data_keys = Object.keys(data['data']);
    const expenditure_data = data['data'];
    expenditure_data_keys.forEach((source, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
        <td>${source}</td>
        <td>${expenditure_data[source]['initial']}</td>
        <td>${expenditure_data[source]['credits']}</td>
        <td>${expenditure_data[source]['debits']}</td>
        <td>${expenditure_data[source]['internal_transfer']}</td>
        <td>${expenditure_data[source]['remaining']}</td>
        `
        expenditure_table.appendChild(row);
    }
    )


    const detail_table = document.querySelector("#detail_table tbody");
    detail_table.innerHTML = '';

    const detail_data = data['detail_view'];
    const detail_data_keys = Object.keys(detail_data);

    detail_data_keys.forEach((commodity, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
        <td>${commodity}</td>
        <td>${(detail_data[commodity]['debits'])}</td>
        `
        detail_table.appendChild(row);
    }
    )
}

async function fetch_internal_transations_data(url = `https://priyanshuarora.pythonanywhere.com/api/expenses/internalTransactions/`) {
    last_req_url = url;
    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Token ${userToken}`
            }
        });
        if (response.status == 200) {
            const data = await response.json();
            updateButtonStates(data.previous, data.next);
            populateInternalTransactionTable(data.results);
            internalTransactionsData = data.results;
            return data.results;
        }
        else if (response.status == 401) {
            login_redirect();
        }
        else {
            document.getElementById("message").style.color = 'red';
            document.getElementById('message').textContent = "error";
            setTimeout(function () {
                document.getElementById('message').textContent = '';
            }, 1500);
        }
    }
    catch (error) {
        console.log(error)
        document.getElementById("message").style.color = 'red';
        document.getElementById("message").textContent =
            "An error occurred during fetching data. " + `${error}`;
        setTimeout(function () {
            document.getElementById('message').textContent = '';
        }, 1500);
    }
}

function populateInternalTransactionTable(data) {
    const internalTransactions_table = document.querySelector("#InternalTransactionTable tbody");
    internalTransactions_table.innerHTML = '';

    const transaction_data = data;
    transaction_data.forEach((transaction, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
        <td>${transaction['date']}</td>
        <td>${transaction['source']['name']}</td>
        <td>${transaction['destination']['name']}</td>
        <td>${transaction['amount']}</td>
        <td>${transaction['comments']}</td>
        <td><a class="icon-link edit-icon" title="Edit"  onclick=openModal('editInternalTransactionModalContent',${index})><i class="fas fa-edit"></i></a></td>
        <td><a class="icon-link delete-icon" title="Delete"  onclick=openModal('deleteInternalTransactionModalContent',${index})><i class="fas fa-trash-alt"></i></a></td> 
        `
        internalTransactions_table.appendChild(row);
    }
    )

}

function addInternalTransactionSave() {
    const transfer_from = document.getElementById("addInternalTransactionFrom").value;
    const transfer_to = document.getElementById("addInternalTransactionTo").value;

    if (transfer_from == transfer_to) {
        document.getElementById("modal-message").style.color = 'red';
        document.getElementById("modal-message").textContent = "From and To can not be same!";
        setTimeout(function () {
            document.getElementById('modal-message').textContent = '';
        }, 1500);
    }
    else {

        fetch("https://priyanshuarora.pythonanywhere.com/api/expenses/internalTransactions/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Token ${userToken}`
            },
            body: JSON.stringify({
                date: document.getElementById("addInternalTransactionDate").value,
                source: transfer_from,
                destination: transfer_to,
                amount: document.getElementById("addInternalTransactionAmount").value,
                comments: document.getElementById("addInternalTransactionComments").value
            })
        }).then((response) => response.json()).then((data) => {
            if (data.id) {
                document.getElementById("modal-message").style.color = 'green';
                document.getElementById("modal-message").textContent = 'Success!!';
            } else {
                document.getElementById("modal-message").style.color = 'red';
                document.getElementById("modal-message").textContent = data[(Object.keys(data))[0]];
            }
            setTimeout(function () {
                document.getElementById('modal-message').textContent = '';
                fetch_internal_transations_data();
                closeModal();
            }, 1500);
        }).catch((error) => {
            document.getElementById("modal-message").style.color = 'red';
            document.getElementById("modal-message").textContent =
                "An error occurred during posting data. " + `${error}`;
            setTimeout(function () {
                document.getElementById('modal-message').textContent = '';
            }, 1500);
        });
    }
}

function editInternalTransactionSave(id) {
    fetch(`https://priyanshuarora.pythonanywhere.com/api/expenses/internalTransactions/${id}/`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Token ${userToken}`
        },
        body: JSON.stringify({
            date: document.getElementById("editInternalTransactionDate").value,
            source: document.getElementById("editInternalTransactionFrom").value,
            destination: document.getElementById("editInternalTransactionTo").value,
            amount: document.getElementById("editInternalTransactionAmount").value,
            comments: document.getElementById("editInternalTransactionComments").value
        })
    }).then((response) => response.json()).then((data) => {
        if (data.id) {
            document.getElementById("modal-message").style.color = 'green';
            document.getElementById("modal-message").textContent = 'Success!!';
        } else {
            document.getElementById("modal-message").style.color = 'red';
            document.getElementById("modal-message").textContent = data[(Object.keys(data))[0]];
        }
        setTimeout(function () {
            document.getElementById('modal-message').textContent = '';
            fetch_internal_transations_data();
            closeModal();
        }, 1500);
    }).catch((error) => {
        document.getElementById("modal-message").style.color = 'red';
        document.getElementById("modal-message").textContent =
            "An error occurred during fetching data. " + `${error}`;
        setTimeout(function () {
            document.getElementById('modal-message').textContent = '';
        }, 1500);
    });
};

function deleteInternalTransactionSave(id) {
    fetch(`https://priyanshuarora.pythonanywhere.com/api/expenses/internalTransactions/${id}/`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Token ${userToken}`
        }
    }).then((data) => {
        if (data.status == 204) {
            document.getElementById("modal-message").style.color = 'green';
            document.getElementById("modal-message").textContent = 'Success!!';
        } else {
            data = data.json();
            document.getElementById("modal-message").style.color = 'red';
            document.getElementById("modal-message").textContent = data[(Object.keys(data))[0]];
        }
        setTimeout(function () {
            document.getElementById('modal-message').textContent = '';
            fetch_internal_transations_data();
            closeModal();
        }, 1500);
    }).catch((error) => {
        document.getElementById("modal-message").style.color = 'red';
        document.getElementById("modal-message").textContent =
            "An error occurred during fetching data. " + `${error}`;
        setTimeout(function () {
            document.getElementById('modal-message').textContent = '';
        }, 1500);
    });
}

function filterInternalTransactionSubmitSave() {
    var clearFilterBtn = document.getElementById("clear-filter-btn");
    clearFilterBtn = customRemoveEventListeners(clearFilterBtn);

    var source = document.getElementById("filterInternalTransactionFrom").value;
    var date = document.getElementById("filterInternalTransactionDate").value;
    var destination = document.getElementById("filterInternalTransactionTo").value;

    url = `https://priyanshuarora.pythonanywhere.com/api/expenses/internalTransactions/?&date=${date}&source=${source}&destination=${destination}`;
    fetch_internal_transations_data(url);
    closeModal();
    clearFilterBtn.disabled = false;
    clearFilterBtn.addEventListener("click", function () {
        fetch_internal_transations_data();
        clearFilterBtn.disabled = true;
    });

}

function fetch_profile() {
    fetch(`https://priyanshuarora.pythonanywhere.com/api/accounts/profile/${userID}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Token ${userToken}`
        }
    }).then((response) => response.json()).then((data) => {
        if (data.id) {
            populateProfile(data);
        } else {
            document.getElementById("message").style.color = 'red';
            document.getElementById("message").textContent = data[(Object.keys(data))[0]];
        }
        setTimeout(function () {
            document.getElementById('message').textContent = '';
        }, 1500);
    }).catch((error) => {
        document.getElementById("message").style.color = 'red';
        document.getElementById("message").textContent =
            "An error occurred during posting data. " + `${error}`;
        setTimeout(function () {
            document.getElementById('message').textContent = '';
        }, 1500);
    });
}

function populateProfile(data) {
    document.getElementById("username").value = data.username;
    document.getElementById("email").value = data.email;
    document.getElementById("firstName").value = data.fname;
    document.getElementById("lastName").value = data.lname;
    document.getElementById("gender").value = data.gender;
}

function updateProfile() {
    const email = document.getElementById("email").value;
    const firstName = document.getElementById("firstName").value;
    const lastName = document.getElementById("lastName").value;
    const gender = document.getElementById("gender").value;



    fetch(`https://priyanshuarora.pythonanywhere.com/api/accounts/profile/${userID}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Token ${userToken}`
        },
        body: JSON.stringify({
            email: email,
            fname: firstName,
            lname: lastName,
            gender: gender
        })
    }).then((response) => response.json()).then((data) => {
        if (data.id) {
            document.getElementById("message").style.color = 'green';
            document.getElementById("message").textContent = 'Success!!';
        } else {
            document.getElementById("message").style.color = 'red';
            document.getElementById("message").textContent = data[(Object.keys(data))[0]];
        }
        setTimeout(function () {
            document.getElementById('message').textContent = '';
        }, 1500);
    }).catch((error) => {
        document.getElementById("message").style.color = 'red';
        document.getElementById("message").textContent =
            "An error occurred during posting data. " + `${error}`;
        setTimeout(function () {
            document.getElementById('message').textContent = '';
        }, 1500);
    });

}

function updatePassword() {
    const current_password = document.getElementById("password1").value;
    const new_password = document.getElementById("password2").value;

    fetch(`https://priyanshuarora.pythonanywhere.com/api/accounts/change-password/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Token ${userToken}`
        },
        body: JSON.stringify({
            current_password: current_password,
            new_password: new_password,
        })
    }).then((response) => response.json()).then((data) => {
        if (data.message) {
            document.getElementById("message").style.color = 'green';
            document.getElementById("message").textContent = "Success! " + data.message;
            logout();

        } else {
            document.getElementById("message").style.color = 'red';
            document.getElementById("message").textContent = data[(Object.keys(data))[0]];
        }
        setTimeout(function () {
            document.getElementById('message').textContent = '';
            document.getElementById("password1").value = '';
            document.getElementById("password2").value = '';
        }, 3000);
    }).catch((error) => {
        document.getElementById("message").style.color = 'red';
        document.getElementById("message").textContent =
            "An error occurred during posting data. " + `${error}`;
        setTimeout(function () {
            document.getElementById('message').textContent = '';
        }, 3000);
    });
}



function export_data(model) {

    let url = '';
    if (last_req_url.includes("?")) {
        url = last_req_url + "&disable_pagination=true&export=true"
    }
    else {
        url = last_req_url + "?disable_pagination=true&export=true"
    }
    fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Token ${userToken}`
        }
    }).then(response => {
        // Check if the request was successful (status code 200)
        if (response.ok) {
            // Trigger the download
            return response.blob();
        } else {
            // Handle the error
            throw new Error('Failed to download Excel file');
        }
    })
        .then(blob => {
            // Create a link element and simulate a click to trigger the download
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'my_file.xlsx';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        })
        .catch(error => {
            // Handle the error
            console.error(error);
        });
}