import * as React from "react";
import { categoryList } from "../constants/categoryList";
import { navbarUl } from "../styles/index.module.css";
import { toggleControll, categoryMaker } from "../utils/toggleUtils";
import { Link } from "gatsby";

const Navbar = () => {
  const [category, setCategory] = React.useState(
    categoryMaker(categoryList.length)
  );
  return (
    <navbar>
      <ul className={navbarUl}>
        {category.map((category) => (
          <li key={category.index}>
            <button
              onClick={() => setCategory(toggleControll(category.toggle))}
            >
              {category.name}
            </button>
          </li>
        ))}
      </ul>
    </navbar>
  );
};
export default Navbar;
