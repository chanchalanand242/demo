package com.task02;

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
        aliasName = "${lambdas_alias_name}",
        logsExpiration = RetentionSetting.SYNDICATE_ALIASES_SPECIFIED
)
public class HelloWorld implements RequestHandler<Object, Map<String, Object>> {
    @Override
    public Map<String, Object> handleRequest(Object request, Context context) {

    Map<String, Object> requestMap = (Map<String, Object>) request;


    String path = (String) requestMap.getOrDefault("path", "");
    String method = (String) requestMap.getOrDefault("httpMethod", "");

    Map<String, Object> response = new HashMap<>();
        if ("/hello".equals(path) && "GET".equalsIgnoreCase(method)) {

        response.put("statusCode", 200);
        response.put("message", "Hello from Lambda");
    } else {

        response.put("statusCode", 400);
        response.put("message", "Bad request syntax or unsupported method. Request path: " + path + ". HTTP method: " + method);
    }

        return response;
    }
}
