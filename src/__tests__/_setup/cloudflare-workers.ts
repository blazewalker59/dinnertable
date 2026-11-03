// Stand-in for the Workers runtime module, which only exists inside
// workerd. Tests that touch bindings mock what they need on top of this.
export const env = {}
