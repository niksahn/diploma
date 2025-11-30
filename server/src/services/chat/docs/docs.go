package docs

import "github.com/swaggo/swag"

const docTemplate = `{
    "swagger": "2.0",
    "info": {
        "description": "Микросервис управления чатами и сообщениями для корпоративного мессенджера",
        "title": "Chat Service API",
        "version": "1.0.0"
    },
    "host": "localhost:8084",
    "basePath": "/api/v1",
    "paths": {}
}`

var SwaggerInfo = &swag.Spec{
	Version:          "1.0.0",
	Host:             "localhost:8084",
	BasePath:         "/api/v1",
	Schemes:          []string{},
	Title:            "Chat Service API",
	Description:      "Микросервис управления чатами и сообщениями для корпоративного мессенджера",
	InfoInstanceName: "swagger",
	SwaggerTemplate:  docTemplate,
}

func init() {
	swag.Register(SwaggerInfo.InstanceName(), SwaggerInfo)
}
