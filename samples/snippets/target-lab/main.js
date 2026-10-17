import { describeTarget } from './metrics.js'

const input = document.querySelector('#size')
const output = document.querySelector('#size-value')
const targets = document.querySelector('.targets')
input.addEventListener('input', () => {
  output.textContent = input.value
  targets.style.setProperty('--size', `${input.value}px`)
})
targets.querySelectorAll('button').forEach((button, index) => {
  button.addEventListener('click', () => {
    document.querySelector('#result').textContent = describeTarget(index, Number(input.value))
  })
})
fetch('data.json')
  .then((response) => response.json())
  .then((data) => {
    document.querySelector('#note').textContent = data.note
  })
