# png-to-cmu
a typescript project that generates python scripts for to render images from files for the cmu sandbox (or cmu_graphics)

contrary to the name, it supports any format [@napi-rs/canvas](https://www.npmjs.com/package/@napi-rs/canvas) supports

> [!WARNING]
> do not use this !!!!!!
> i wrote this in a weekend, with minimal python knowledge, because i was bored. it is very unoptimised
> 
> also, like, i made this without realizing the [cmu image api exists](https://academy.cs.cmu.edu/docs/images)

## installation
there is no npm package for this and i will never upload this to npm

you must build it yourself, which is very simple:

```
git clone https://github.com/czctus/png-to-cmu
cd png-to-cmu
pnpm run build
```

## usage
again don't use it... but if you do:

```ts
import {createCMU} from "png-to-cmu"
const python = await createCMU("my-really-cool-image.png", {
sandbox: true // or false?
}
```

## license
this code is licensed to you under the MIT license

see [LICENSE](LICENSE) for more info