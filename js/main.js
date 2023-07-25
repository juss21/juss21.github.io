const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const main = document.getElementById('main');

var [total, xpUp, xpDown, auditRatio, completed] = Array.from({ length: 5 }, () => 0);
var taskID = 85;

let querySearch = `query {
    user {
      firstName
      lastName
      auditRatio
      attrs
      transactions(where: {event: {id: {_eq: ${taskID}}}}) {
        type
        amount
        object {
          name
        }
      }
    }
  }`

loginForm.addEventListener('submit', function (event) {
    event.preventDefault(); // Prevent the form from submitting normally
    const enteredUsername = document.getElementById('username').value;
    const enteredPassword = document.getElementById('password').value;

    login(enteredUsername, enteredPassword, "https://01.kood.tech/api/auth/signin")
});


async function login(enteredUsername, enteredPassword, url) {
    const loginRequest = {
        method: 'POST',
        headers: {
            Authorization: `Basic ` + btoa(`${enteredUsername}:${enteredPassword}`)
        },
    };
    let resp = await getResponse(loginRequest, url)
    if (resp && resp != 0) {
        loginForm.style.display = 'none';

        localStorage.setItem('accessToken', resp)
        graphRequest(resp, 'https://01.kood.tech/api/graphql-engine/v1/graphql')
    } else {
        document.getElementById("failed").innerHTML = `Login failed, try again!`;
    }
}

async function graphRequest(token, url) {
    const graphqlRequest = {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            query: querySearch
        })
    };

    let resp = await getResponse(graphqlRequest, url)
    if (resp && resp != 0) decipherData(resp)
    else console.error("failed graph request!")
}

async function getResponse(loginRequest, url) {
    let response = await fetch(url, loginRequest)
    if (response.ok) {
        resp = await response.json()
        return resp
    } else return 0
}

function decipherData(resp) {
    const xpArray = Object.values(resp.data.user[0].transactions);
    xpArray.forEach((item) => {
        if (item.type === 'xp') {
            total += item.amount
            completed++
        }
    });
    auditRatio = Math.round(resp.data.user[0].auditRatio * 100) / 100

    let age = calculateDaysLeft(resp.data.user[0].attrs["dateOfBirth"])
    let idCardInfo = `<h3>You are <span style="font-weight: 1000; color: tomato;">${age[0]}</span> years(${age[1]} days) old<span style="color:red">!!!</span> </h3>`
    
    
    main.innerHTML += `<button type="submit" id="logout">Logout</button>
        <h1>Welcome, ${resp.data.user[0].firstName} ${resp.data.user[0].lastName}!
        <img class="profilepic" src=${resp.data.user[0].attrs["image"]}> </h1><br>
        <div id="userInfo"">${idCardInfo}</h3>
        <p>Projects completed: ${completed}</p></div>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <div id="chartContainer" class="chart">
        </div>
        `
        
        let logout = document.getElementById('logout')

        logout.addEventListener('click', (e) => {
            console.log(e, "SIIIn")
            localStorage.clear();
            window.location.reload();
        });
        
    createChart(xpArray, 'bar', true, `<h3> Total xp: ${total} Bytes </h3>`, 'projects')
    createChart(xpArray, 'pie', false, ``, 'auditRatio')
}

function calculateDaysLeft(targetDate) {
    const currentDate = new Date();
    const targetDateTime = new Date(targetDate);
    
    const timeDifferenceMs = currentDate- targetDateTime;
    const daysLeft = Math.ceil(timeDifferenceMs / (1000 * 60 * 60 * 24));
  
    let age = currentDate.getFullYear() - targetDateTime.getFullYear();
  
    // Check if the birth date has occurred this year already
    const birthMonth = targetDateTime.getMonth();
    const currentMonth = currentDate.getMonth();
    if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDate.getDate() < targetDateTime.getDate())) {
      age--;
    }
  
    return [age, daysLeft];
}

function createChart(dataArray, graphType, checker, tableHead, chartID) {
    const chartContainer = document.getElementById('chartContainer');

    // Create the wrapper div for each chart and its tableHead
    const chartWrapper = document.createElement('div');
    chartWrapper.style.marginBottom = '20px'; // Add some spacing between charts
    chartWrapper.style.marginLeft = '20px';
    chartWrapper.className = 'chart-wrapper'
    chartWrapper.id = chartID;

    let head = document.createElement('h3')

    let chartCanvas = document.createElement('canvas');
    const values = setChartValues(dataArray, checker)

    if (!checker) {
        tableHead = `<h3> Audit xp gained: ${xpUp} <br>
    Audit xp lost: ${Math.round(xpDown)} <br>
    Audit Ratio ${auditRatio} </h3>`
    }
    head.innerHTML = tableHead;
    chartWrapper.appendChild(head);

    const ctx = chartCanvas.getContext('2d');
    const myChart = new Chart(ctx, {
        type: graphType,
        data: values,
        options: {
            plugins: {
                legend: {
                    display: false,
                }
            }
        }
    });

    chartWrapper.appendChild(chartCanvas);
    chartContainer.appendChild(chartWrapper);
}


function setChartValues(dataArray, checker) {
    var [projectNames, projectPoints, randomColor, borderColor, backgroundColor] = Array.from({ length: 5 }, () => []);
    let done = 0, received = 0;

    dataArray.forEach((item) => {
        if (checker && item.type === "xp") {
            projectPoints.push(item.amount);
            projectNames.push(item.object.name);
        } else if (!checker && item.type === "up") {
            xpUp += item.amount
            done++
        } else if (!checker && item.type === "down") {
            xpDown += item.amount
            received++
        }
    });
    if (!checker) {
        projectPoints.push(done, received);
        projectNames.push(`Audits done`, `Audits received`);
    }

    for (let i = 0; i < dataArray.length; i++) randomColor.push(getRandomColor())
    randomColor.forEach((colorObj) => {
        backgroundColor.push(colorObj.color);
        borderColor.push(colorObj.border);
    });

    return {
        labels: projectNames,
        datasets: [{
            data: projectPoints,
            backgroundColor: backgroundColor,
            borderColor: borderColor,
            borderWidth: 1
        }]
    };
}

function getRandomColor() {
    const red = Math.floor(Math.random() * 200 + 56);
    const green = Math.floor(Math.random() * 200 + 56);
    const blue = Math.floor(Math.random() * 200 + 56);

    return {
        color: `rgba(${red}, ${green}, ${blue}, 0.4)`,
        border: `rgba(${red}, ${green}, ${blue}, 1)`
    }
}