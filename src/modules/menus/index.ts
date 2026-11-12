// Public interface of the menus module (M1). Other modules import ONLY from here.
export { listDishes, createDish } from './dish.service';
export type { CreateDishInput } from './dish.schema';
export * from './dish.model';
export * from './dish.repository';
export * from './ingredient.model';
export * from './ingredient.repository';
export * from './supplier.model';
export * from './supplier.repository';
export * from './recipe.model';
export * from './recipe.repository';
export * from './menu.model';
export * from './menu.repository';
