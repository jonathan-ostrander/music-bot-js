export default function similarity(left, right) {
  if (left.length == 0 && right.length == 0) return 1;
  if (left.length == 0 || right.length == 0) return 0;
  const unionSet = new Set();
  const leftSet = new Set();
  Array.from(left).forEach(c => {
    leftSet.add(c);
    unionSet.add(c);
  });
  const rightSet = new Set();
  Array.from(right).forEach(c => {
    rightSet.add(c);
    unionSet.add(c);
  });
  const intersection = leftSet.size + rightSet.size - unionSet.size;
  return intersection / unionSet.size;
};
