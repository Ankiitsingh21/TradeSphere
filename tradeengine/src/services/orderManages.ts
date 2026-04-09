const { PriorityQueue } = require('@datastructures-js/priority-queue');


const buy = new PriorityQueue((a,b)=>{
        if(a.price===b.price){
                return a.createdAt-b.createdAt
        }
        return b.price-a.price;
});

const sell = new PriorityQueue((a,b)=>{
        if(a.price===b.price){
                return a.createdAt-b.createdAt
        }
        return a.price-b.price
})