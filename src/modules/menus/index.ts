// Public interface of the menus module (M1). Other modules import ONLY from here.
export { listDishes, createDish } from './dish.service';
export type { CreateDishInput } from './dish.schema';
export type { DishDoc, IDish } from './dish.model';
