// app/types/global.d.ts

// Extend the Window interface to include ethereum
interface Window {
    ethereum?: any;
    fs?: {
      readFile: (path: string, options?: { encoding?: string }) => Promise<string | Uint8Array>;
    };
  }
  
  // Declare ValueType to ensure toFixed works in charts
  type ValueType = string | number | Array<string | number>;