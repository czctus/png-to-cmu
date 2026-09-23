export interface config {
    /** whether or not the code is running in the cmu web sandbox */
    sandbox?: boolean;
    /** width of the canvas. do note that sandbox is 400x400. */
    canvasWidth?: number;
    /** height of canvas. do note that sandbox is 400x400. */
    canvasHeight?: number;
}