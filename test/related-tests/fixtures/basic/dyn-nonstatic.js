const name = 'source';

export const load = () => import(`./${name}.js`);
