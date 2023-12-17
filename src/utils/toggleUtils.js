import { categoryList } from '../constants/categoryList';
export function toggleControll(toggle) {
  return !toggle;
}
export function categoryMaker(n) {
  return Array.from({ length: n }, (v, i) => ({
    index: i,
    name: categoryList[i],
    path: `path${i}`,
    toggle: false,
  }));
}
