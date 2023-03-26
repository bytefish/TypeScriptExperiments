// This experiment is based on the great "typeserializer" library by Dan Revah: 
//
//      * https://github.com/danrevah/typeserializer
//
// The MIT License
//
// Copyright (c) 2017-2019 Dan Revah

import 'reflect-metadata';

// Helpers
export function isObject(val: any) {
    return typeof val === 'object' && val !== null && !Array.isArray(val);
}

export function isUndefined(val: any) {
    return typeof val === 'undefined';
}

// Creates a Decorator
export function createDecorator(name: string, keySymbol: Symbol, value: any) {
    return function <T extends Object>(target: T, key: keyof T) {
        const obj = Reflect.getMetadata(keySymbol, target) || {};

        if (!isUndefined(obj[key])) {
            throw new Error(
                `Cannot apply @${name} decorator twice on property '${String(key)}' of class '${(target as any).constructor.name}'.`
            );
        }

        Reflect.defineMetadata(keySymbol, { ...obj, ...{ [key]: value } }, target);
    };
}

// Symbol
export const JsonPropertySymbol = Symbol('JsonProperty');
export const JsonTypeSymbol = Symbol('JsonType');
export const JsonConverterSymbol = Symbol('JsonConverter');

// Decorators
export function JsonProperty(name: string) {
    return createDecorator("JsonProperty", JsonPropertySymbol, name);
}

export function JsonType(type: any) {
    return createDecorator("JsonType", JsonTypeSymbol, type);
}

export function JsonConverter<T>(fn: (value: any, obj: any) => T) {
    return createDecorator("JsonConverter", JsonConverterSymbol, fn);
}

export function deserialize<T>(json: string, classType: any): any {
    return transform(toObject(json), classType);
}

// Transformers
export function transformArray(arr: any[], classType: any): any[] {
    return arr.map((elm: any) => (Array.isArray(elm) ? transformArray(elm, classType) : transform(elm, classType)));
}

export function transform(obj: any, classType: any) {

    // If the given value is not an object, we cannot reflect
    if (!isObject(obj)) {
        return obj;
    }

    // Create an instance, so we can reflect the Decorator metadata:
    const instance = new classType();

    // Reflects the Metadata associated with each property:
    const jsonPropertyMap = Reflect.getMetadata(JsonPropertySymbol, instance) || {};
    const jsonTypeMap = Reflect.getMetadata(JsonTypeSymbol, instance) || {};
    const jsonConverterMap = Reflect.getMetadata(JsonConverterSymbol, instance) || {};

    // Maps the Name to the Property
    const nameToPropertyMap = Object.keys(jsonPropertyMap)
        .reduce((accumulator: any, key: string) => ({ ...accumulator, [jsonPropertyMap[key]]: key }), {});

    Object.keys(obj).forEach((key: string) => {
        if (nameToPropertyMap.hasOwnProperty(key)) {
            instance[nameToPropertyMap[key]] = obj[key];
        } else {
            instance[key] = obj[key];
        }
        
        if (typeof jsonConverterMap[key] === 'function') {
            
            instance[key] = jsonConverterMap[key].call(null, instance[key], instance);
            return;
        }

        if (!jsonTypeMap.hasOwnProperty(key)) {
            return;
        }

        const type = jsonTypeMap[key];

        if (Array.isArray(type)) {
            instance[key] = transformArray(obj[key], type[0]);
        } else if (type === Date) {
            instance[key] = new Date(obj[key]);
        } else {
            instance[key] = transform(obj[key], type);
        }
    });

    return instance;
}

function toObject(json: string): any {
    try {
        return JSON.parse(json);
    } catch (_) {
        throw `Unable to deserialize, not a valid JSON.`;
    }
}