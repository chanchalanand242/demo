package com.task03;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.syndicate.deployment.annotations.lambda.LambdaHandler;
import com.syndicate.deployment.model.RetentionSetting;

import java.util.HashMap;
import java.util.Map;

@LambdaHandler(lambdaName = "hello_world", roleName = "hello_world-role", isPublishVersion = true, aliasName = "learn", logsExpiration = RetentionSetting.SYNDICATE_ALIASES_SPECIFIED)
public class HelloWorld implements RequestHandler<Object, Map<String, Object>> {
    public Map<String, Object> handleRequest(Object request, Context context) {
        System.out.println("Hello from lambda");
        Map<String, Object> resultMap = new HashMap<String, Object>();        // Set the status code
         resultMap.put("statusCode", 200);        // Instead of putting the message in the body, put it directly in the resultMap
         resultMap.put("message", "Hello from Lambda");
         return resultMap;
    }
}
