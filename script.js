let score = 0;

function punch() {
  score++;
  document.getElementById("score").innerText = score;

  let bag = document.getElementById("bag");
  bag.style.transform = "scale(1.2)";

  setTimeout(() => {
    bag.style.transform = "scale(1)";
  }, 100);
}