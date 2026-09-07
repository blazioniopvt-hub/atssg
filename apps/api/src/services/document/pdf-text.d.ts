declare module 'pdf-text' {
  function pdfText(buffer: Buffer): Promise<string>;
  export default pdfText;
}