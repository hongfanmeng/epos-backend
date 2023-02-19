import { faker } from "@faker-js/faker";
import _ from "lodash";

export const generateItems = ({ minCount: min, maxCount: max, generator }) => {
  return _.range(faker.datatype.number({ min, max })).map(() => generator());
};

export const randomChoice = (arr: any[]) => {
  return arr.at(faker.datatype.number({ max: arr.length }));
};
