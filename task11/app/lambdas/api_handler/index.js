const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");

// Update AWS region
AWS.config.update({ region: "us-east-1" });

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
    const headers = event.headers;

    try {
        if (route === "/signup" && method === "POST") {
            return await handleSignup(body);
        } else if (route === "/signin" && method === "POST") {
            return await handleSignin(body);
        } else if (route === "/tables" && method === "GET") {
            return await getTables(headers);
        } else if (route === "/tables" && method === "POST") {
            return await addTable(body, headers);
        } else if (route.startsWith("/tables/") && method === "GET") {
            const tableId = route.split("/")[2];
            return await getTableById(tableId, headers);
        } else if (route === "/reservations" && method === "POST") {
            return await createReservation(body, headers);
        } else if (route === "/reservations" && method === "GET") {
            return await getReservations(headers);
        } else {
            return formatResponse(400, { error: "Invalid request" });
        }
    } catch (error) {
        console.error("Error: ", error);
        return formatResponse(500, { error: error.message });
    }
};

// Signup User
async function handleSignup(body) {
    const { firstName, lastName, email, password } = body;

    // Validate inputs
    if (!firstName || !lastName || !email || !password) {
        return formatResponse(400, { error: "Missing required fields: firstName, lastName, email, password" });
    }
    if (!validateEmail(email)) {
        return formatResponse(400, { error: "Invalid email format" });
    }
    if (!validatePassword(password)) {
        return formatResponse(400, { error: "Password must be at least 12 characters, alphanumeric, and include $%^*-_" });
    }

    const params = {
        ClientId: CLIENT_ID,
        Username: email,
        Password: password,
        UserAttributes: [
            { Name: "given_name", Value: firstName },
            { Name: "family_name", Value: lastName },
            { Name: "email", Value: email },
        ],
    };

    try {
        await cognito.signUp(params).promise();
        return formatResponse(200, { message: "User registered successfully" });
    } catch (error) {
        console.error("Signup error: ", error);

        if (error.code === "UsernameExistsException") {
            return formatResponse(400, { error: "User with this email already exists" });
        }

        return formatResponse(500, { error: "Something went wrong during signup. Please try again later." });
    }
}

// Signin User
async function handleSignin(body) {
    const { email, password } = body;

    if (!email || !password) {
        return formatResponse(400, { error: "Email and password are required" });
    }

    const params = {
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: CLIENT_ID,
        AuthParameters: {
            USERNAME: email,
            PASSWORD: password,
        },
    };

    try {
        const response = await cognito.initiateAuth(params).promise();
        return formatResponse(200, {
            accessToken: response.AuthenticationResult.IdToken,
        });
    } catch (error) {
        console.error("Signin error: ", error);

        if (error.code === "NotAuthorizedException" || error.code === "UserNotFoundException") {
            return formatResponse(400, { error: "Invalid username or password" });
        }

        return formatResponse(500, { error: "Signin failed. Please try again later." });
    }
}

// Get all tables
async function getTables(headers) {
    const userId = validateToken(headers);

    try {
        const result = await dynamoDB.scan({ TableName: TABLES_TABLE }).promise();
        return formatResponse(200, { tables: result.Items });
    } catch (error) {
        console.error("Get Tables error: ", error);
        return formatResponse(500, { error: "Cannot retrieve tables" });
    }
}

// Add a new table
async function addTable(body, headers) {
    const userId = validateToken(headers);

    const { id, number, places, isVip, minOrder } = body;
    if (!id || !number || !places || isVip === undefined) {
        return formatResponse(400, { error: "Missing or invalid fields" });
    }

    const params = {
        TableName: TABLES_TABLE,
        Item: { id, number, places, isVip, minOrder },
    };

    try {
        await dynamoDB.put(params).promise();
        return formatResponse(200, { id });
    } catch (error) {
        console.error("Add Table error: ", error);
        return formatResponse(500, { error: "Cannot add table" });
    }
}

// Get table by ID
async function getTableById(tableId, headers) {
    const userId = validateToken(headers);

    try {
        const params = { TableName: TABLES_TABLE, Key: { id: parseInt(tableId) } };
        const result = await dynamoDB.get(params).promise();

        if (!result.Item) {
            return formatResponse(400, { error: "Table not found" });
        }

        return formatResponse(200, result.Item);
    } catch (error) {
        console.error("Get Table By ID error: ", error);
        return formatResponse(500, { error: "Cannot retrieve table" });
    }
}

// Create a reservation
async function createReservation(body, headers) {
    const userId = validateToken(headers);

    const { tableNumber, clientName, phoneNumber, date, slotTimeStart, slotTimeEnd } = body;
    if (!tableNumber || !clientName || !phoneNumber || !date || !slotTimeStart || !slotTimeEnd) {
        return formatResponse(400, { error: "Missing required fields" });
    }

    const reservationId = uuidv4();
    const params = {
        TableName: RESERVATIONS_TABLE,
        Item: { reservationId, tableNumber, clientName, phoneNumber, date, slotTimeStart, slotTimeEnd },
    };

    try {
        await dynamoDB.put(params).promise();
        return formatResponse(200, { reservationId });
    } catch (error) {
        console.error("Create Reservation error: ", error);
        return formatResponse(500, { error: "Cannot create reservation" });
    }
}

// Get all reservations
async function getReservations(headers) {
    const userId = validateToken(headers);

    try {
        const result = await dynamoDB.scan({ TableName: RESERVATIONS_TABLE }).promise();
        return formatResponse(200, { reservations: result.Items });
    } catch (error) {
        console.error("Get Reservations error: ", error);
        return formatResponse(500, { error: "Cannot retrieve reservations" });
    }
}

// Token validation
function validateToken(headers) {
    const token = headers.Authorization?.split(" ")[1];
    if (!token) throw new Error("Missing access token");
    return token; // Assuming token validation is verified externally
}

// Helper functions
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[$%^*-_]).{12,}$/;
    return passwordRegex.test(password);
}

function formatResponse(statusCode, body) {
    return {
        statusCode,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    };
}