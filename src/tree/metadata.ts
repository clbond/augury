import {EventEmitter} from '@angular/core';

import {
  AsyncSubject,
  BehaviorSubject,
  ReplaySubject,
  Subscriber,
  Observable,
  Subject,
} from 'rxjs';

import {
  Path,
  serializePath,
} from './path';

import {functionName} from '../utils';

export enum PropertyMetadata {
  Input         = 0x1,
  Output        = 0x2,
  Subject       = 0x4,
  Observable    = 0x8,
  EventEmitter  = 0x10,
}

export type Metadata = Map<any, PropertyMetadata>;

export interface InstanceValue {
  instance;
  metadata: any | Metadata;
}

const getPropertyMetadata =
    (inputs: Set<string>, outputs: Set<string>, instance, top: string, map: Metadata) => {
  if (map.has(instance)) {
    return;
  }

  let flags: PropertyMetadata = 0;

  if (instance != null && isScalar(instance) === false) {
    switch (functionName(instance.constructor)) {
      case functionName(EventEmitter):
        flags |= PropertyMetadata.EventEmitter;
        break;
      case functionName(AsyncSubject):
      case functionName(BehaviorSubject):
      case functionName(ReplaySubject):
      case functionName(Subscriber):
      case functionName(Subject):
        flags |= PropertyMetadata.Subject | PropertyMetadata.Observable;
        break;
      case functionName(Observable):
        flags |= PropertyMetadata.Observable;
        break;
      default:
        for (const key of Object.keys(instance)) {
          const value = instance[key];

          map.set(instance, flags);

          if (map.has(value) === false) {
            getPropertyMetadata(inputs, outputs, value, null, map);
          }
        }
        break;
    }
  }

  if (top) {
    if (inputs.has(top)) {
      flags |= PropertyMetadata.Input;
    }
    else if (outputs.has(top)) {
      flags |= PropertyMetadata.Output;
    }
  }

  map.set(instance, flags);
};

export const getInstanceValue =
    (instance, inputs: Set<string>, outputs: Set<string>): InstanceValue => {
  const map = new Map<any, PropertyMetadata>();

  if (instance != null) {
    for (const key of Object.keys(instance)) {
      const value = instance[key];
      getPropertyMetadata(inputs, outputs, value, key, map);
    }
  }

  const reconstructedMap = new Array<any>();

  let iterator = map.entries();
  do {
    const result = iterator.next();
    if (result.done) {
      break;
    }
    if (result.value[1] !== 0) {
      reconstructedMap.push([result.value[0], result.value[1]]);
    }
  }
  while (true);

  return {instance, metadata: reconstructedMap};
};

const isScalar = value => {
  switch (typeof value) {
    case 'string':
    case 'boolean':
    case 'function':
    case 'undefined':
      return true;
    default:
      return false;
  }
};
