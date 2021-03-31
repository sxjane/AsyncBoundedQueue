const Queue = require('./AsyncBoundedQueue')
const async = require('async')
const sleep = require('./sleep')

//check the size setting 
test.each([1, 2, 8])('Check the length of the object: %i', (l)=>{
    var q = new Queue(l)
    expect(q.max_size).toBe(l)
})

//the length cannot be 0
test('Should throw an error when the length is 0 or null', () => {
    expect(()=>{new Queue(0)}).toThrow()
    expect(()=>{new Queue(null)}).toThrow()
  }
)

//the default length is 16
test('The default length is 16', ()=>{
    var q = new Queue()
    expect(q.max_size).toBe(16)
})

//enqueue then dequeue
test('Enqueue then dequeue Sequentially', async ()=>{
    var q = new Queue(1)
    await q.enqueue(10)
    var result = await q.dequeue()
    expect(result).toEqual(10)
})

//asynchronously dequeue and enqueue once
test('Dequeue enqueue parallel', async ()=>{
    var q = new Queue()
    async.parallel([
        async()=>{
            var result = await q.dequeue()
            expect(result).toEqual(10)
        },
        ()=>{
            q.enqueue(10)
        }
    ])
})

//asynchronously dequeue and enqueue more than once, the order of enqueue is [1,2,3,4.5]
test('The order of enqueue is 1,2,3,4,5, the order of dequeue should be [1,2,3,4,5]', ()=>{
    var q = new Queue(1)
    var i = 1
    const dequeue = (callback)=>{q.dequeue().then(result=>callback(null,result))}
    const enqueue = (callback)=>{q.enqueue(i++).then(()=>callback(null,null))}
    const async_queue = ()=> async.parallel([
        dequeue,
        dequeue,
        enqueue,
        enqueue,
        dequeue,
        enqueue,
        dequeue,
        enqueue,
        dequeue,
        enqueue
    ])
    return async_queue().then(result=>{
        var expect_result = []
        for(item of result){
            if(item){
                expect_result.push(item)
            }
        }
        expect(expect_result).toEqual([1,2,3,4,5])
    })
})

//when the queue is empty, dequeue is await
test('Dequeue of a empty queue', ()=>{
    var q = new Queue()
    async.timeout(async ()=>{
        await q.dequeue()
    }, 1000)((error,result)=>{
        expect(error).toMatch('error')
        expect(q.dequeue_size).toBe(1)
    })
})

//when the queue is full, enqueue is blocked
test('Enqueue to a full queue', ()=>{
    var q = new Queue(1)
    async.timeout(async ()=>{
        await q.enqueue(1)
        await q.enqueue(2)
        await q.enqueue(3)
    }, 1000)((error,result)=>{
        expect(error).toMatch('error')
        expect(q.enqueue_size).toEqual(q.max_size)
    })
})

//enqueue is unblocked after the enqueue is blocked
test('Unblock enqueue when the queue is not full', async()=>{
    var q = new Queue(1)
    const block_task = async ()=>{
        await q.enqueue(1)
        await q.enqueue(2)
        await q.enqueue(3)
    }
    const unblock_task = async ()=>{
        sleep(1000)
        var first = await q.dequeue()
        var second = await q.dequeue()
        var third = await q.dequeue()
        expect([first,second,third]).toEqual([1,2,3])
    }

    async.parallel([
        block_task,
        unblock_task
    ])
} )


