const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Update AWS region
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
        return formatResponse(400, { error: "Password must be at least 8 characters, with one uppercase, one lowercase, and one number" });
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
            token: response.AuthenticationResult.IdToken,
            refreshToken: response.AuthenticationResult.RefreshToken,
        });
    } catch (error) {
        console.error("Signin error: ", error);

        if (error.code === "NotAuthorizedException" || error.code === "UserNotFoundException") {
            return formatResponse(400, { error: "Invalid username or password" });
        }

        return formatResponse(500, { error: "Signin failed. Please try again later." });
    }
}

// Common Helper Functions
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
}

function formatResponse(statusCode, body) {
    return {
        statusCode,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    };
}