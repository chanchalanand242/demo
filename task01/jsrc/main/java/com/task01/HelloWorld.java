package com.task01;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.syndicate.deployment.annotations.lambda.LambdaHandler;
import com.syndicate.deployment.model.RetentionSetting;

import java.util.HashMap;
import java.util.Map;

@LambdaHandler(
        lambdaName = "hello_world",
        roleName = "hello_world-role",
        isPublishVersion = true,
        aliasName = "learn",
        logsExpiration = RetentionSetting.SYNDICATE_ALIASES_SPECIFIED
)
public class HelloWorld implements RequestHandler<Map<String, Object>, Map<String, Object>> {

    @Override
    public Map<String, Object> handleRequest(Map<String, Object> request, Context context) {

        String path = (String) request.get("path");
        String method = (String) request.get("httpMethod");


        Map<String, Object> response = new HashMap<>();

        if ("/hello".equals(path) && "GET".equals(method)) {

            response.put("statusCode", 200);
            Map<String, String> body = new HashMap<>();
            body.put("message", "Hello, world!");
            response.put("body", body);
        } else {

            response.put("statusCode", 400);
            Map<String, String> errorBody = new HashMap<>();
            errorBody.put("message", "Bad request syntax or unsupported method. " +
                    String.format("Request path: %s. HTTP method: %s", path, method));
            response.put("body", errorBody);
        }

        return response;
    }
}