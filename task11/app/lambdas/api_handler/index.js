const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

AWS.config.update({ region: 'us-east-1' });

const cognito = new AWS.CognitoIdentityServiceProvider();
const dynamoDB = new AWS.DynamoDB.DocumentClient();

const TABLES_TABLE = process.env.tables_table;
const RESERVATIONS_TABLE = process.env.reservations_table;
const USER_POOL_ID = process.env.cup_id;
const CLIENT_ID = process.env.cup_client_id;

exports.handler = async (event) => {
    console.log("Incoming event: ", JSON.stringify(event));

    const route = event.resource;
    const method = event.httpMethod;
    const body = event.body ? JSON.parse(event.body) : {};
    const headers = event.headers || {};

    try {
        if (route === "/signup" && method === "POST") {
            return await handleSignup(body);
        } else if (route === "/signin" && method === "POST") {
            return await handleSignin(body);
        } else if (route === "/tables" && method === "GET") {
            return await getTables();
        } else if (route === "/tables" && method === "POST") {
            return await addTable(body);
        } else if (route.startsWith("/tables/") && method === "GET") {
            const tableId = route.split("/")[2];
            return await getTableById(tableId);
        } else if (route === "/reservations" && method === "POST") {
            return await createReservation(body);
        } else if (route === "/reservations" && method === "GET") {
            return await getReservations();
        } else {
            return formatResponse(400, { error: "Invalid request" });
        }
    } catch (error) {
        console.error("Error: ", error);
        return formatResponse(500, { error: error.message });
    }
};

async function handleSignup(body) {
    const { firstName, lastName, email, password } = body;

    const params = {
        UserPoolId: USER_POOL_ID,
        Username: email,
        TemporaryPassword: password,
        UserAttributes: [
            { Name: "given_name", Value: firstName },
            { Name: "family_name", Value: lastName },
            { Name: "email", Value: email },
        ],
    };

    await cognito.adminCreateUser(params).promise();
    return formatResponse(200, { message: "User registered successfully" });
}

async function handleSignin(body) {
    const { email, password } = body;

    const params = {
        AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
        ClientId: CLIENT_ID,
        UserPoolId: USER_POOL_ID,
        AuthParameters: {
            USERNAME: email,
            PASSWORD: password,
        },
    };

    const response = await cognito.adminInitiateAuth(params).promise();
    return formatResponse(200, { accessToken: response.AuthenticationResult.IdToken });
}

async function getTables() {
    const params = { TableName: TABLES_TABLE };
    const data = await dynamoDB.scan(params).promise();
    return formatResponse(200, { tables: data.Items });
}

async function addTable(body) {
    const { id, number, places, isVip, minOrder } = body;

    const params = {
        TableName: TABLES_TABLE,
        Item: { id, number, places, isVip, minOrder },
    };

    await dynamoDB.put(params).promise();
    return formatResponse(200, { id });
}

async function getTableById(tableId) {
    const params = {
        TableName: TABLES_TABLE,
        Key: { id: tableId },
    };

    const data = await dynamoDB.get(params).promise();
    if (!data.Item) {
        return formatResponse(400, { error: "Table not found" });
    }

    return formatResponse(200, data.Item);
}

async function createReservation(body) {
    const { tableNumber, clientName, phoneNumber, date, slotTimeStart, slotTimeEnd } = body;

    const params = {
        TableName: RESERVATIONS_TABLE,
        Item: {
            id: uuidv4(),
            tableNumber,
            clientName,
            phoneNumber,
            date,
            slotTimeStart,
            slotTimeEnd,
        },
    };

    await dynamoDB.put(params).promise();
    return formatResponse(200, { reservationId: params.Item.id });
}

async function getReservations() {
    const params = { TableName: RESERVATIONS_TABLE };
    const data = await dynamoDB.scan(params).promise();
    return formatResponse(200, { reservations: data.Items });
}

function formatResponse(statusCode, body) {
    return {
        statusCode,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        isBase64Encoded: false,
    };
}

