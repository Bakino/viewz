import { DataZ } from '../html/lib/bindz.mjs'; // Update with actual path
import { jest } from '@jest/globals';
import { structuredClone } from 'structured-clone-polyfill';

global.structuredClone = structuredClone;

// // Mock helper functions that aren't defined in the provided code
// const mockHelperFunctions = () => {
//   global.idInc = 1;
  
//   global.exprExtractor = (text) => {
//     const parts = [];
//     const regex = /\$\{([^}]+)\}/g;
//     let lastIndex = 0;
//     let match;
    
//     while ((match = regex.exec(text)) !== null) {
//       if (match.index > lastIndex) {
//         parts.push({ type: 'text', text: text.slice(lastIndex, match.index) });
//       }
//       parts.push({ type: 'expression', text: match[1] });
//       lastIndex = regex.lastIndex;
//     }
    
//     if (lastIndex < text.length) {
//       parts.push({ type: 'text', text: text.slice(lastIndex) });
//     }
    
//     return parts;
//   };
  
//   global.extractExpressions = (text) => {
//     const matches = text.match(/\$\{([^}]+)\}/g);
//     return matches ? matches.map(m => m.slice(2, -1)) : [];
//   };
  
//   global.extractPaths = (expression) => {
//     const paths = [];
//     const regex = /\b([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\b/g;
//     let match;
//     while ((match = regex.exec(expression)) !== null) {
//       paths.push(match[1]);
//     }
//     return [...new Set(paths)];
//   };
  
//   global.transformToVariableName = (name) => name.replace(/[^a-zA-Z0-9_]/g, '_');
  
//   global.substituteVariable = (str, variable, realPath) => {
//     return str.replace(new RegExp(`\\b${variable}\\b`, 'g'), realPath);
//   };
  
//   global.hasWritableValue = (element) => {
//     return ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName);
//   };
  
//   global.FORMATTERS = {};
// };

describe('DataZ', () => {
  beforeEach(() => {
    // mockHelperFunctions();
  });

  describe('Constructor', () => {
    test('should create instance with empty data', () => {
      const dataZ = new DataZ();
      expect(dataZ.originalData).toEqual({});
      expect(dataZ.flattenedData).toBeInstanceOf(Map);
      expect(dataZ.listeners).toBeInstanceOf(Map);
      expect(dataZ.data).toBeDefined();
    });

    test('should create instance with initial data', () => {
      const initialData = { name: 'John', age: 30 };
      const dataZ = new DataZ(initialData);
      expect(dataZ.originalData).toEqual(initialData);
      expect(dataZ.data.name).toBe('John');
      expect(dataZ.data.age).toBe(30);
    });
  });

  describe('Listener Management', () => {
    test('should add listener for path', () => {
      const dataZ = new DataZ({ user: { name: 'John' } });
      const listener = jest.fn();
      
      dataZ.addListener('user.name', listener);
      
      expect(dataZ.listeners.has('user.name')).toBe(true);
      expect(dataZ.listeners.get('user.name').has(listener)).toBe(true);
    });

    test('should add listener with wildcard pattern', () => {
      const dataZ = new DataZ({ users: [{ name: 'John' }] });
      const listener = jest.fn();
      
      dataZ.addListener('users.*.name', listener);
      
      const pathListener = dataZ.listeners.get('users.*.name');
      expect(pathListener.has(listener)).toBe(true);
      
      const storedListener = pathListener.get(listener);
      expect(storedListener.regexp).toBeInstanceOf(RegExp);
      expect(storedListener.regexp.test('users.0.name')).toBe(true);
    });

    test('should handle wildcard paths in listeners', () => {
        const listener = jest.fn();
        const dataZ = new DataZ({ user: { name: 'John', age: 30 } });
        dataZ.addListener('user.*', listener);
        dataZ.data.user.name = 'Jane';
        dataZ.data.user.age = 31;
        expect(listener).toHaveBeenCalledTimes(2);
    });

    test('should remove listener', () => {
      const dataZ = new DataZ();
      const listener = jest.fn();
      
      dataZ.addListener('test.path', listener);
      expect(dataZ.listeners.get('test.path').has(listener)).toBe(true);
      
      dataZ.removeListener('test.path', listener);
      expect(dataZ.listeners.get('test.path').has(listener)).toBe(false);
    });
  });

  describe('Data Observation', () => {
    test('should notify listeners on property change', () => {
      const dataZ = new DataZ({ user: { name: 'John' } });
      const listener = jest.fn();
      
      dataZ.addListener('user.name', listener);
      dataZ.data.user.name = 'Jane';
      
      expect(listener).toHaveBeenCalledWith({
        oldValue: 'John',
        newValue: 'Jane',
        target: dataZ.data.user,
        property: 'name',
        autobind: true
      });
    });

    test('should not notify listeners when value unchanged', () => {
      const dataZ = new DataZ({ name: 'John' });
      const listener = jest.fn();
      
      dataZ.addListener('name', listener);
      dataZ.data.name = 'John'; // Same value
      
      expect(listener).not.toHaveBeenCalled();
    });

    test('should handle nested object changes', () => {
      const dataZ = new DataZ({ user: { profile: { name: 'John' } } });
      const listener = jest.fn();
      
      dataZ.addListener('user.profile.name', listener);
      dataZ.data.user.profile.name = 'Jane';
      
      expect(listener).toHaveBeenCalled();
    });

    test('should handle array modifications', () => {
      const dataZ = new DataZ({ items: ['a', 'b'] });
      const listener = jest.fn();
      
      dataZ.addListener('items.length', listener);
      dataZ.data.items.push('c');
      
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('getValueFromPath', () => {
    test('should retrieve simple property', () => {
      const dataZ = new DataZ({ name: 'John' });
      expect(dataZ.getValueFromPath('name')).toBe('John');
    });

    test('should retrieve nested property', () => {
      const dataZ = new DataZ({ user: { name: 'John' } });
      expect(dataZ.getValueFromPath('user.name')).toBe('John');
    });

    test('should retrieve array element', () => {
      const dataZ = new DataZ({ items: ['a', 'b', 'c'] });
      expect(dataZ.getValueFromPath('items.1')).toBe('b');
    });

    test('should return undefined for non-existent path', () => {
      const dataZ = new DataZ({ user: { name: 'John' } });
      expect(dataZ.getValueFromPath('user.email')).toBeUndefined();
    });
  });

  describe('getListenersForPath', () => {
    test('should find exact match listeners', () => {
      const dataZ = new DataZ();
      const listener = jest.fn();
      dataZ.addListener('user.name', listener);
      
      const listeners = dataZ.getListenersForPath(['user', 'name']);
      expect(listeners).toHaveLength(1);
      expect(listeners[0].listener).toBe(listener);
    });

    test('should find wildcard listeners', () => {
      const dataZ = new DataZ();
      const listener = jest.fn();
      dataZ.addListener('user.*', listener);
      
      const listeners = dataZ.getListenersForPath(['user', 'name']);
      expect(listeners).toHaveLength(1);
      expect(listeners[0].listener).toBe(listener);
    });
  });
});