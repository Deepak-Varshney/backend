const asyncHandler = (reqestHandler)=>{
    (req,res,next)=>{
        Promise.resolve(reqestHandler(req,res,next)).catch((err)=> next(err))
    }
}

export { asyncHandler }

// const asyncHandler = (func) => { } step 1
// const asyncHandler = (func) => { () => { } } step 2
// const asyncHandler = (func) => () => { } step 3
// const asyncHandler = (func) => async () => { } step 4

// const asyncHandler = (fn) => async(req,res,next) => { 
//     try {
//         await fn(req,res,next)
//     } catch (error) {
//         res.status(err.code || 500).json({
//             success:false,
//             message: err.message
//         })
//     }
// }